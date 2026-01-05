import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CognitoService } from '../auth/cognito.service';
import { User, UserRole } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  private readonly tableName = 'users';

  constructor(
    private dynamodb: DynamoDBService,
    private cognitoService: CognitoService
  ) {}

  async createUser(
    companyId: string | undefined,
    email: string,
    password: string | undefined,
    firstName: string,
    lastName: string,
    role: UserRole | undefined,
    poolType: 'users' | 'admin' = 'users',
    generatePassword = false
  ): Promise<{ user: User; temporary_password?: string }> {
    const isAdminPool = poolType === 'admin';

    // Admin pool users do not belong to a tenant; use a platform placeholder
    // Customer users without a company yet get a temporary placeholder; will be updated after setup.
    const resolvedCompanyId = isAdminPool ? 'platform-admin' : companyId || 'no-company';
    const resolvedRole = isAdminPool ? UserRole.ADMIN : role || UserRole.OWNER;

    // Generate a secure random password if not provided
    const resolvedPassword =
      password && password.length > 0
        ? password
        : generatePassword
        ? this.generateSecurePassword()
        : null;

    if (!resolvedPassword) {
      throw new BadRequestException('Password is required unless generate_password is true');
    }

    // Check if user with email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      // If Cognito doesn't have this user, treat it as stale and remove from DynamoDB
      const cognitoUserExists = await this.cognitoService.userExists(email, poolType).catch(() => true);
      if (!cognitoUserExists) {
        await this.dynamodb.delete(this.tableName, {
          company_id: existingUser.company_id,
          user_id: existingUser.user_id,
        });
      } else {
        throw new ConflictException('User with this email already exists');
      }
    }

    const userId = uuidv4();
    const timestamp = Date.now();

    const user: User = {
      company_id: resolvedCompanyId,
      user_id: userId,
      email,
      phone_number: undefined,
      first_name: firstName,
      last_name: lastName,
      role: resolvedRole,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // This logic determines if the user is self-registering (and provides a password)
    // or if an admin is creating them (with a generated/temp password).
    const makePasswordPermanent = !generatePassword && !!password;

    // Create user in Cognito
    const fullName = `${firstName} ${lastName}`;
    await this.cognitoService.createUser(
      email,
      resolvedPassword,
      isAdminPool ? undefined : (companyId || undefined),
      fullName,
      poolType,
      { makePasswordPermanent }
    );

    // Store user data. No password hash stored.
    const dbUser = {
      ...user,
      pool_type: poolType,
    };

    await this.dynamodb.put(this.tableName, dbUser);

    // Only return a temporary password if one was generated.
    const tempPassword = generatePassword ? resolvedPassword : undefined;

    return { user, temporary_password: tempPassword };
  }

  private generateSecurePassword(): string {
    // Ensure mix of upper, lower, digits, and symbols, 14 chars
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*()';
    const bytes = randomBytes(16);
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars[bytes[i] % chars.length];
    }
    // Guarantee at least one of each required class
    pwd += 'A1a!';
    return pwd;
  }

  async findByEmail(email: string): Promise<User | null> {
    // The email-index in production uses company_id as the partition key and email as the sort key.
    // Since we don't always have company_id, fall back to a small scan with a filter on email.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#email = :email',
      expressionAttributeNames: { '#email': 'email' },
      expressionAttributeValues: { ':email': email },
      limit: 1,
    });

    if (result.items.length === 0) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...user } = result.items[0] as any;
    return user as User;
  }

  async findByEmailForCompany(
    email: string,
    companyId: string
  ): Promise<User | null> {
    // Production email index keys differ; safest is a filtered scan scoped by company_id + email.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#company_id = :company_id AND #email = :email',
      expressionAttributeNames: { '#company_id': 'company_id', '#email': 'email' },
      expressionAttributeValues: { ':company_id': companyId, ':email': email },
      limit: 1,
    });

    if (result.items.length === 0) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...user } = result.items[0] as any;
    return user as User;
  }

  async findById(companyId: string, userId: string): Promise<User | null> {
    const user = await this.dynamodb.get(this.tableName, {
      company_id: companyId,
      user_id: userId,
    });

    if (!user) {
      return null;
    }

    // Remove password_hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user as any;
    return userWithoutPassword as User;
  }

  async updateLastLogin(companyId: string, userId: string): Promise<void> {
    await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      { last_login_at: Date.now(), updated_at: Date.now() }
    );
  }

  async listCompanyUsers(companyId: string): Promise<User[]> {
    const result = await this.dynamodb.query(
      this.tableName,
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId }
    );

    // Remove password hashes from all users
    return result.items.map((user: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  /**
   * List all users across all companies (admin only)
   */
  async listAllUsers(): Promise<User[]> {
    const result = await this.dynamodb.scan(this.tableName);

    // Remove password hashes from all users
    return result.items.map((user: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  /**
   * Update user details (admin only)
   */
  async updateUser(
    companyId: string,
    userId: string,
    updates: {
      company_id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      role?: UserRole;
      phone_number?: string;
      is_active?: boolean;
    }
  ): Promise<User> {
    const user = await this.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedData = {
      ...updates,
      updated_at: Date.now(),
    };

    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      updatedData
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = result as any;
    return userWithoutPassword as User;
  }

  /**
   * Delete user from Cognito and DynamoDB (admin only)
   */
  async deleteUser(companyId: string, userId: string, email: string): Promise<void> {
    const user = await this.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const poolType: 'users' | 'admin' =
      (user as any).pool_type === 'admin' || (user.role === UserRole.ADMIN && user.company_id === 'platform-admin')
        ? 'admin'
        : 'users';

    // Delete from Cognito
    await this.cognitoService.deleteUser(email, poolType);

    // Delete from DynamoDB
    await this.dynamodb.delete(this.tableName, { company_id: companyId, user_id: userId });
  }

  /**
   * Disable user account (admin only)
   */
  async disableUser(companyId: string, userId: string, email: string): Promise<User> {
    const user = await this.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const poolType: 'users' | 'admin' =
      (user as any).pool_type === 'admin' || (user.role === UserRole.ADMIN && user.company_id === 'platform-admin')
        ? 'admin'
        : 'users';

    // Disable in Cognito
    await this.cognitoService.disableUser(email, poolType);

    // Update in DynamoDB
    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      { is_active: false, updated_at: Date.now() }
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = result as any;
    return userWithoutPassword as User;
  }

  /**
   * Enable user account (admin only)
   */
  async enableUser(companyId: string, userId: string, email: string): Promise<User> {
    const user = await this.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const poolType: 'users' | 'admin' =
      (user as any).pool_type === 'admin' || (user.role === UserRole.ADMIN && user.company_id === 'platform-admin')
        ? 'admin'
        : 'users';

    // Enable in Cognito
    await this.cognitoService.enableUser(email, poolType);

    // Update in DynamoDB
    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      { is_active: true, updated_at: Date.now() }
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = result as any;
    return userWithoutPassword as User;
  }

  /**
   * Move an existing user record to a new company_id (used after initial setup)
   */
  async moveUserToCompany(
    existingUser: any,
    newCompanyId: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    const timestamp = Date.now();

    // Remove old record keyed by previous company_id
    await this.dynamodb.delete(this.tableName, {
      company_id: existingUser.company_id,
      user_id: existingUser.user_id,
    });

    const updatedRecord = {
      ...existingUser,
      company_id: newCompanyId,
      first_name: firstName || existingUser.first_name,
      last_name: lastName || existingUser.last_name,
      updated_at: timestamp,
    };

    await this.dynamodb.put(this.tableName, updatedRecord);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = updatedRecord as any;
    return userWithoutPassword as User;
  }
}
