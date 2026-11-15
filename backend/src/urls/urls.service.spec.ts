import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, GoneException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UrlsService } from './urls.service';
import { Url } from './entities/url.entity';
import { User } from '../users/entities/user.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';

describe('UrlsService', () => {
  let service: UrlsService;
  let mockRepository: any;
  let mockSettingsRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) =>
        Promise.resolve({
          id: 'mock-uuid-123',
          created_at: new Date(),
          updated_at: new Date(),
          clicks_count: 0,
          ...entity,
        }),
      ),
      increment: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      query: jest.fn().mockResolvedValue([]),
    };

    mockSettingsRepository = {
      find: jest.fn().mockResolvedValue([{
        allow_custom_alias_free: true,
        allow_guest_passwords: true,
        guest_expiration_minutes: 15,
        maintenance_mode: false,
      }]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlsService,
        {
          provide: getRepositoryToken(Url),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SystemSetting),
          useValue: mockSettingsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'BASE_URL') return 'http://localhost:5000';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UrlsService>(UrlsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a shortened URL with generated Base62 code', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.create({
        original_url: 'https://github.com/facebook/react',
      });

      expect(result).toBeDefined();
      expect(result.original_url).toBe('https://github.com/facebook/react');
      expect(result.short_code).toBeDefined();
      expect(result.short_url).toContain('http://localhost:5000/');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if custom alias is already taken', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'existing-id', short_code: 'my-alias' });

      await expect(
        service.create({
          original_url: 'https://google.com',
          custom_alias: 'my-alias',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if alias is a reserved keyword', async () => {
      await expect(
        service.create({
          original_url: 'https://google.com',
          custom_alias: 'admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByCode', () => {
    it('should return the URL and increment clicks count if valid and active', async () => {
      const mockUrl: Partial<Url> = {
        id: '123',
        original_url: 'https://google.com',
        short_code: 'goo123',
        is_active: true,
        expires_at: null,
        max_clicks: null,
        clicks_count: 5,
      };

      mockRepository.findOne.mockResolvedValue(mockUrl);

      const result = await service.findByCode('goo123');
      expect(result.original_url).toBe('https://google.com');
      expect(mockRepository.increment).toHaveBeenCalledWith({ id: '123' }, 'clicks_count', 1);
    });

    it('should throw NotFoundException if short code does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findByCode('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException if URL is disabled', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '123',
        short_code: 'disabled123',
        is_active: false,
      });

      await expect(service.findByCode('disabled123')).rejects.toThrow(GoneException);
    });

    it('should throw GoneException if URL has expired by date', async () => {
      const pastDate = new Date(Date.now() - 100000);
      mockRepository.findOne.mockResolvedValue({
        id: '123',
        short_code: 'expired123',
        is_active: true,
        expires_at: pastDate,
      });

      await expect(service.findByCode('expired123')).rejects.toThrow(GoneException);
    });

    it('should throw GoneException if max click limit is reached', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '123',
        short_code: 'clicklimited',
        is_active: true,
        max_clicks: 10,
        clicks_count: 10,
      });

      await expect(service.findByCode('clicklimited')).rejects.toThrow(GoneException);
    });
  });
});

