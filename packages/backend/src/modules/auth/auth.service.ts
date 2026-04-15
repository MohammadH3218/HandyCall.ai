import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { ProRegisterDto } from './dto/pro-register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { Customer, Pro, UserType } from '@handycall/shared';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;    // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;         // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private db: DynamoDBService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Customer Registration ──────────────────────────────────────────────────

  async registerCustomer(dto: CustomerRegisterDto) {
    if (dto.pdpl_consent === false) {
      throw new BadRequestException(
        'PDPL consent is required. Users must consent to data collection per Saudi PDPL (Royal Decree M/19).',
      );
    }

    await this.assertNoDuplicateEmail('customers', dto.email);
    if (dto.id_type) {
      await this.assertNoDuplicateId('customers', dto.id_type, dto.national_id, dto.iqama_number);
    }

    const customer_id = uuidv4();
    const now = Date.now();
    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { firstName, lastName } = this.resolveNameParts(dto.first_name, dto.last_name, dto.email, 'Customer');

    const customer: Omit<Customer, 'password_hash'> & { password_hash: string } = {
      customer_id,
      email: dto.email.toLowerCase(),
      password_hash,
      first_name: firstName,
      last_name: lastName,
      phone_number: dto.phone_number,
      id_type: dto.id_type,
      national_id: dto.id_type === 'NATIONAL_ID' ? dto.national_id : undefined,
      iqama_number: dto.id_type === 'IQAMA' ? dto.iqama_number : undefined,
      id_verified: false,
      district: dto.district,
      city: 'Riyadh',
      preferred_language: dto.preferred_language ?? 'en',
      status: 'ACTIVE',
      email_verified: false,
      pdpl_consent: true,
      pdpl_consent_at: dto.pdpl_consent_at ?? now,
      marketing_consent: dto.marketing_consent ?? false,
      created_at: now,
      updated_at: now,
    };

    await this.db.put('customers', customer);

    const tokens = this.signTokens(customer_id, 'CUSTOMER', dto.email);
    const { password_hash: _, ...safeCustomer } = customer;
    return { ...tokens, user: safeCustomer, user_type: 'CUSTOMER' as UserType };
  }

  // ─── Pro Registration ───────────────────────────────────────────────────────

  async registerPro(dto: ProRegisterDto) {
    if (dto.pdpl_consent === false) {
      throw new BadRequestException('PDPL consent is required.');
    }

    await this.assertNoDuplicateEmail('pros', dto.email);
    if (dto.id_type) {
      await this.assertNoDuplicateId('pros', dto.id_type, dto.national_id, dto.iqama_number);
    }

    const pro_id = uuidv4();
    const now = Date.now();
    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { firstName, lastName } = this.resolveNameParts(dto.first_name, dto.last_name, dto.email, 'Pro');

    const pro: Omit<Pro, 'password_hash'> & { password_hash: string } = {
      pro_id,
      email: dto.email.toLowerCase(),
      password_hash,
      first_name: firstName,
      last_name: lastName,
      phone_number: dto.phone_number,
      id_type: dto.id_type,
      national_id: dto.id_type === 'NATIONAL_ID' ? dto.national_id : undefined,
      iqama_number: dto.id_type === 'IQAMA' ? dto.iqama_number : undefined,
      id_verified: false,
      iban_verified: false,
      speaks_arabic: true,
      speaks_english: false,
      service_districts: [],
      city: 'Riyadh',
      status: 'PENDING_REVIEW',
      onboarding_step: 1,
      is_available: false,
      average_rating: 0,
      total_reviews: 0,
      total_bookings: 0,
      completion_rate: 0,
      pdpl_consent: true,
      pdpl_consent_at: dto.pdpl_consent_at ?? now,
      marketing_consent: dto.marketing_consent ?? false,
      email_verified: false,
      created_at: now,
      updated_at: now,
    };

    await this.db.put('pros', pro);

    const tokens = this.signTokens(pro_id, 'PRO', dto.email);
    const { password_hash: _, ...safePro } = pro;
    return { ...tokens, user: safePro, user_type: 'PRO' as UserType };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const table = dto.user_type === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = dto.user_type === 'CUSTOMER' ? 'customer_id' : 'pro_id';

    const { items } = await this.db.query(
      table,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email },
      { indexName: 'email-index' },
    );

    if (!items.length) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = items[0] as any;

    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox.',
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended. Contact support.');
    }

    if (dto.user_type === 'PRO' && user.status === 'REJECTED') {
      throw new UnauthorizedException(
        'Your pro application was rejected. Contact support for details.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user_id = user[pkField];
    const tokens = this.signTokens(user_id, dto.user_type, email);

    await this.db.update(table, { [pkField]: user_id }, { last_login_at: Date.now() });

    const { password_hash: _, ...safeUser } = user;
    return { ...tokens, user: safeUser, user_type: dto.user_type };
  }

  async exchangeOAuth(dto: OAuthExchangeDto) {
    const email = dto.email.toLowerCase();
    const table = dto.user_type === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = dto.user_type === 'CUSTOMER' ? 'customer_id' : 'pro_id';
    const existingUser = await this.findUserByEmail(table, email);
    const now = Date.now();
    const { firstName, lastName } = this.resolveNameParts(
      dto.given_name,
      dto.family_name,
      email,
      dto.user_type === 'CUSTOMER' ? 'Customer' : 'Pro',
      dto.name,
    );

    let userRecord: any;

    if (existingUser) {
      userRecord = await this.db.update(
        table,
        { [pkField]: existingUser[pkField] },
        {
          first_name: existingUser.first_name || firstName,
          last_name: existingUser.last_name || lastName,
          email_verified: true,
          updated_at: now,
          last_login_at: now,
        },
      );
    } else if (dto.user_type === 'CUSTOMER') {
      const customer_id = uuidv4();
      const password_hash = await bcrypt.hash(uuidv4(), BCRYPT_ROUNDS);
      const customer: Omit<Customer, 'password_hash'> & { password_hash: string } = {
        customer_id,
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        id_verified: false,
        city: 'Riyadh',
        preferred_language: 'en',
        status: 'ACTIVE',
        email_verified: true,
        pdpl_consent: true,
        pdpl_consent_at: now,
        marketing_consent: false,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      };
      await this.db.put('customers', customer);
      userRecord = customer;
    } else {
      const pro_id = uuidv4();
      const password_hash = await bcrypt.hash(uuidv4(), BCRYPT_ROUNDS);
      const pro: Omit<Pro, 'password_hash'> & { password_hash: string } = {
        pro_id,
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        id_verified: false,
        iban_verified: false,
        speaks_arabic: false,
        speaks_english: true,
        service_districts: [],
        city: 'Riyadh',
        status: 'PENDING_REVIEW',
        onboarding_step: 1,
        is_available: false,
        average_rating: 0,
        total_reviews: 0,
        total_bookings: 0,
        completion_rate: 0,
        pdpl_consent: true,
        pdpl_consent_at: now,
        marketing_consent: false,
        email_verified: true,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      };
      await this.db.put('pros', pro);
      userRecord = pro;
    }

    const user_id = userRecord[pkField];
    const tokens = this.signTokens(user_id, dto.user_type, email);
    const { password_hash: _, ...safeUser } = userRecord;
    return { ...tokens, user: safeUser, user_type: dto.user_type };
  }

  // ─── Email Verification ─────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{
    message: string;
    access_token: string;
    refresh_token: string;
    user_type: UserType;
    user: Record<string, any>;
  }> {
    const record = await this.db.get('email_verifications', { token });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    if (record.used) {
      throw new BadRequestException('This verification link has already been used.');
    }

    if (record.expires_at * 1000 < Date.now()) {
      throw new BadRequestException('Verification link has expired. Request a new one.');
    }

    const table = record.user_type === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = record.user_type === 'CUSTOMER' ? 'customer_id' : 'pro_id';

    const verifiedUser = await this.db.update(
      table,
      { [pkField]: record.user_id },
      { email_verified: true, status: record.user_type === 'CUSTOMER' ? 'ACTIVE' : 'PENDING_REVIEW', updated_at: Date.now() },
    );

    await this.db.update('email_verifications', { token }, { used: true });

    if (!verifiedUser?.email) {
      throw new NotFoundException('Verified account not found.');
    }

    const tokens = this.signTokens(record.user_id, record.user_type, verifiedUser.email);
    const { password_hash: _, ...safeUser } = verifiedUser;

    return {
      message: 'Email verified successfully.',
      ...tokens,
      user_type: record.user_type,
      user: safeUser,
    };
  }

  async resendVerification(email: string, userType: UserType) {
    const normalizedEmail = email.toLowerCase();
    const table = userType === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = userType === 'CUSTOMER' ? 'customer_id' : 'pro_id';
    const user = await this.findUserByEmail(table, normalizedEmail);

    if (!user) {
      return {
        message: 'If that account exists, a verification email has been sent.',
      };
    }

    if (user.email_verified) {
      return {
        message: 'This email is already verified. You can sign in now.',
      };
    }

    const token = await this.getVerificationToken(user[pkField], userType, normalizedEmail);
    return {
      message: 'Verification email sent.',
      token,
      first_name: user.first_name || (userType === 'CUSTOMER' ? 'Customer' : 'Pro'),
    };
  }

  // ─── Token Refresh ──────────────────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user_id, user_type, email } = payload;
    return this.signTokens(user_id, user_type, email);
  }

  // ─── Forgot Password ────────────────────────────────────────────────────────

  async forgotPassword(email: string, userType: UserType): Promise<{ message: string }> {
    const table = userType === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = userType === 'CUSTOMER' ? 'customer_id' : 'pro_id';

    const { items } = await this.db.query(
      table,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email.toLowerCase() },
      { indexName: 'email-index' },
    );

    // Always return success to avoid user enumeration (security best practice)
    if (!items.length) {
      return { message: 'If that account exists, a reset link has been sent.' };
    }

    const user = items[0] as any;
    const user_id = user[pkField];
    const token = uuidv4();
    const now = Date.now();

    await this.db.put('password_resets', {
      token,
      user_id,
      user_type: userType,
      email: email.toLowerCase(),
      expires_at: Math.floor((now + PASSWORD_RESET_TTL_MS) / 1000), // DynamoDB TTL expects seconds
      used: false,
      created_at: now,
    });

    // Email is sent by caller (AuthController injects EmailService)
    return { message: 'If that account exists, a reset link has been sent.', token } as any;
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.db.get('password_resets', { token });

    if (!record || record.used || record.expires_at * 1000 < Date.now()) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const table = record.user_type === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = record.user_type === 'CUSTOMER' ? 'customer_id' : 'pro_id';
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.db.update(
      table,
      { [pkField]: record.user_id },
      { password_hash, updated_at: Date.now() },
    );

    await this.db.update('password_resets', { token }, { used: true });

    return { message: 'Password reset successfully.' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private signTokens(user_id: string, user_type: UserType, email: string) {
    const payload = { user_id, user_type, email };
    const access_token = this.jwt.sign(payload);
    const refresh_token = this.jwt.sign(
      { user_id, user_type, email },
      { expiresIn: this.config.get<number>('JWT_REFRESH_EXPIRES_IN', 2592000) },
    );
    return { access_token, refresh_token };
  }

  private async assertNoDuplicateEmail(table: string, email: string) {
    const { items } = await this.db.query(
      table,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email.toLowerCase() },
      { indexName: 'email-index' },
    );
    if (items.length) {
      throw new ConflictException('An account with this email already exists.');
    }
  }

  private async findUserByEmail(table: string, email: string) {
    const { items } = await this.db.query(
      table,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email.toLowerCase() },
      { indexName: 'email-index' },
    );
    return items[0] as any | undefined;
  }

  private async assertNoDuplicateId(
    table: string,
    idType: 'NATIONAL_ID' | 'IQAMA',
    nationalId?: string,
    iqamaNumber?: string,
  ) {
    if (idType === 'NATIONAL_ID' && nationalId) {
      const { items } = await this.db.query(
        table,
        '#nid = :nid',
        { '#nid': 'national_id' },
        { ':nid': nationalId },
        { indexName: 'national-id-index' },
      );
      if (items.length) {
        throw new ConflictException('An account with this National ID already exists.');
      }
    }

    if (idType === 'IQAMA' && iqamaNumber) {
      const { items } = await this.db.query(
        table,
        '#iqama = :iqama',
        { '#iqama': 'iqama_number' },
        { ':iqama': iqamaNumber },
        { indexName: 'iqama-index' },
      );
      if (items.length) {
        throw new ConflictException('An account with this Iqama number already exists.');
      }
    }
  }

  private async createEmailVerificationToken(
    userId: string,
    userType: 'CUSTOMER' | 'PRO',
    email: string,
  ) {
    const token = uuidv4();
    const now = Date.now();
    await this.db.put('email_verifications', {
      token,
      user_id: userId,
      user_type: userType,
      email: email.toLowerCase(),
      expires_at: Math.floor((now + EMAIL_VERIFY_TTL_MS) / 1000), // DynamoDB TTL in seconds
      used: false,
      created_at: now,
    });
    return token;
  }

  /** Expose token creation so controller can pass it to EmailService */
  async getVerificationToken(userId: string, userType: 'CUSTOMER' | 'PRO', email: string) {
    return this.createEmailVerificationToken(userId, userType, email);
  }

  private resolveNameParts(
    firstName: string | undefined,
    lastName: string | undefined,
    email: string,
    fallbackFirstName: string,
    fullName?: string,
  ) {
    const trimmedFirstName = firstName?.trim();
    const trimmedLastName = lastName?.trim();

    if (trimmedFirstName) {
      return {
        firstName: trimmedFirstName,
        lastName: trimmedLastName || '',
      };
    }

    const trimmedFullName = fullName?.trim();
    if (trimmedFullName) {
      const [first, ...rest] = trimmedFullName.split(/\s+/);
      return {
        firstName: first || fallbackFirstName,
        lastName: rest.join(' '),
      };
    }

    const localPart = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    if (localPart) {
      const [first, ...rest] = localPart.split(/\s+/);
      return {
        firstName: first || fallbackFirstName,
        lastName: rest.join(' '),
      };
    }

    return {
      firstName: fallbackFirstName,
      lastName: '',
    };
  }
}
