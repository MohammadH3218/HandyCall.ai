import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CognitoService } from '../auth/cognito.service';
import { User, UserRole } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly tableName = 'users';

  constructor(
    private dynamodb: DynamoDBService,
    private cognitoService: CognitoService
  ) {}

  async createUser(
    companyId: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    phoneNumber?: string
  ): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const timestamp = Date.now();

    const user: User = {
      company_id: companyId,
      user_id: userId,
      email,
      phone_number: phoneNumber,
      first_name: firstName,
      last_name: lastName,
      role,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Create user in Cognito
    const fullName = `${firstName} ${lastName}`;
    await this.cognitoService.createUser(email, password, companyId, fullName, 'users');

    // Store user with password hash (password_hash not in User type, stored separately)
    const dbUser = {
      ...user,
      password_hash: passwordHash,
    };

    await this.dynamodb.put(this.tableName, dbUser);

    return user;
  }

  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    // The email-index in production uses company_id as the partition key and email as the sort key.
    // Since we don't always have company_id, fall back to a small scan with a filter on email.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#email = :email',
      expressionAttributeNames: { '#email': 'email' },
      expressionAttributeValues: { ':email': email },
      limit: 1,
    });

    return result.items.length > 0 ? (result.items[0] as any) : null;
  }

  async findByEmailForCompany(
    email: string,
    companyId: string
  ): Promise<(User & { password_hash: string }) | null> {
    // Production email index keys differ; safest is a filtered scan scoped by company_id + email.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#company_id = :company_id AND #email = :email',
      expressionAttributeNames: { '#company_id': 'company_id', '#email': 'email' },
      expressionAttributeValues: { ':company_id': companyId, ':email': email },
      limit: 1,
    });

    return result.items.length > 0 ? (result.items[0] as any) : null;
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
    const { password_hash, ...userWithoutPassword } = user as any;
    return userWithoutPassword as User;
  }

  async validatePassword(user: User & { password_hash: string }, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
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

    // Delete from Cognito
    await this.cognitoService.deleteUser(email, 'users');

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

    // Disable in Cognito
    await this.cognitoService.disableUser(email, 'users');

    // Update in DynamoDB
    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      { is_active: false, updated_at: Date.now() }
    );

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

    // Enable in Cognito
    await this.cognitoService.enableUser(email, 'users');

    // Update in DynamoDB
    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId, user_id: userId },
      { is_active: true, updated_at: Date.now() }
    );

    const { password_hash, ...userWithoutPassword } = result as any;
    return userWithoutPassword as User;
  }
}
