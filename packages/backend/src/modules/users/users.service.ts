import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { User, UserRole } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly tableName = 'users';

  constructor(private dynamodb: DynamoDBService) {}

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

    // Store user with password hash (password_hash not in User type, stored separately)
    const dbUser = {
      ...user,
      password_hash: passwordHash,
    };

    await this.dynamodb.put(this.tableName, dbUser);

    return user;
  }

  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const result = await this.dynamodb.query(
      this.tableName,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email },
      { indexName: 'email-index', limit: 1 }
    );

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
}
