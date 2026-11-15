import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersRepo: any;
  let mockRefreshTokensRepo: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) =>
        Promise.resolve({
          id: 'user-uuid-1',
          created_at: new Date(),
          updated_at: new Date(),
          role: UserRole.USER,
          is_active: true,
          ...entity,
        }),
      ),
    };

    mockRefreshTokensRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue(true),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked.jwt.token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokensRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => defaultValue || 'test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      const res = await service.register({
        name: 'Gaurav',
        email: 'gaurav@example.com',
        password: 'password123',
      });

      expect(res.user.email).toBe('gaurav@example.com');
      expect(res.accessToken).toBe('mocked.jwt.token');
      expect(res.refreshToken).toBe('mocked.jwt.token');
      expect(mockUsersRepo.save).toHaveBeenCalled();
      expect(mockRefreshTokensRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          name: 'Gaurav',
          email: 'gaurav@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user and return tokens on valid password', async () => {
      const hashedPassword = await bcrypt.hash('secretPass', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: hashedPassword,
        is_active: true,
        role: UserRole.USER,
      });

      const res = await service.login({
        email: 'test@example.com',
        password: 'secretPass',
      });

      expect(res.user.email).toBe('test@example.com');
      expect(res.accessToken).toBe('mocked.jwt.token');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('realPassword', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: hashedPassword,
        is_active: true,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke user refresh tokens', async () => {
      const res = await service.logout('user-1');
      expect(res.success).toBe(true);
      expect(mockRefreshTokensRepo.update).toHaveBeenCalledWith(
        { user_id: 'user-1', is_revoked: false },
        { is_revoked: true },
      );
    });
  });
});

