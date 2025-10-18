import { Model } from 'mongoose';
import { BaseEntity } from '../entity';
import { BaseRepositoryAbstract } from './base.abstract.repository';

class TestEntity extends BaseEntity {
  name: string;
}

class TestRepository extends BaseRepositoryAbstract<TestEntity> {
  constructor(model: Model<TestEntity>) {
    super(model);
  }
}

type MockModel = {
  create: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

describe('BaseRepositoryAbstract', () => {
  let repository: TestRepository;
  let mockModel: MockModel;

  const mockEntity = {
    _id: 'test-id',
    name: 'Test Entity',
    deletedAt: null,
  };

  const mockEntityWithSave = {
    ...mockEntity,
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  };

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    repository = new TestRepository(mockModel as unknown as Model<TestEntity>);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save entity', async () => {
      mockModel.create.mockResolvedValue(mockEntityWithSave);

      const result = await repository.create(
        mockEntity as unknown as TestEntity,
      );

      expect(mockModel.create).toHaveBeenCalledWith(mockEntity);
      expect(mockEntityWithSave.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findOneById', () => {
    it('should return entity when found and not deleted', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntity),
      });

      const result = await repository.findOneById('test-id');

      expect(mockModel.findById).toHaveBeenCalledWith(
        'test-id',
        undefined,
        undefined,
      );
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity is soft deleted', async () => {
      const deletedEntity = { ...mockEntity, deletedAt: new Date() };
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedEntity),
      });

      const result = await repository.findOneById('test-id');

      expect(result).toBeNull();
    });

    it('should return null when entity not found', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findOneById('non-existent');

      expect(result).toBeNull();
    });

    it('should use projection when provided', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntity),
      });

      await repository.findOneById('test-id', 'name');

      expect(mockModel.findById).toHaveBeenCalledWith(
        'test-id',
        'name deletedAt',
        undefined,
      );
    });
  });

  describe('findOneByCondition', () => {
    it('should return entity matching condition', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntity),
      });

      const result = await repository.findOneByCondition({ name: 'Test' });

      expect(mockModel.findOne).toHaveBeenCalledWith(
        { name: 'Test', deletedAt: null },
        undefined,
        undefined,
      );
      expect(result).toEqual(mockEntity);
    });

    it('should exclude soft deleted entities', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await repository.findOneByCondition({ name: 'Deleted' });

      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
        undefined,
        undefined,
      );
    });
  });

  describe('findMany', () => {
    it('should return count and items', async () => {
      const mockItems = [mockEntity, { ...mockEntity, _id: 'test-id-2' }];

      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockItems),
      });

      const result = await repository.findMany({ name: 'Test' });

      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        name: 'Test',
        deletedAt: null,
      });
      expect(mockModel.find).toHaveBeenCalledWith(
        { name: 'Test', deletedAt: null },
        undefined,
        undefined,
      );
      expect(result).toEqual({ count: 2, items: mockItems });
    });

    it('should exclude soft deleted entities', async () => {
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      mockModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await repository.findMany({});

      expect(mockModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
        undefined,
        undefined,
      );
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updatedEntity = { ...mockEntity, name: 'Updated' };
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedEntity),
      });

      const result = await repository.update('test-id', { name: 'Updated' });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'test-id', deletedAt: null },
        { name: 'Updated' },
        { new: true },
      );
      expect(result).toEqual(updatedEntity);
    });

    it('should not update soft deleted entities', async () => {
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('deleted-id', { name: 'Updated' });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
        expect.objectContaining({}) as Record<string, unknown>,
        expect.objectContaining({}) as Record<string, unknown>,
      );
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete entity', async () => {
      mockModel.findById.mockResolvedValue(mockEntity);
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockEntity, deletedAt: new Date() }),
      });

      const result = await repository.softDelete('test-id');

      expect(mockModel.findById).toHaveBeenCalledWith('test-id');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          deletedAt: expect.any(Date) as Date,
        }),
      );
      expect(result).toBe(true);
    });

    it('should return false when entity not found', async () => {
      mockModel.findById.mockResolvedValue(null);

      const result = await repository.softDelete('non-existent');

      expect(mockModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete entity', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntity),
      });
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntity),
      });

      const result = await repository.hardDelete('test-id');

      expect(mockModel.findById).toHaveBeenCalledWith('test-id');
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('test-id');
      expect(result).toBe(true);
    });

    it('should return false when entity not found', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.hardDelete('non-existent');

      expect(mockModel.findByIdAndDelete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
