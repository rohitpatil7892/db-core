import { UserRole } from '../interfaces/user-role.interface';
import { DatabaseService } from '../services/database.service';
import { ApiError } from '../middlewares/error.middleware';

export class UserRoleModel {
  private static instance: UserRoleModel;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): UserRoleModel {
    if (!UserRoleModel.instance) {
      UserRoleModel.instance = new UserRoleModel();
    }
    return UserRoleModel.instance;
  }

  public async createUserRole(userRole: UserRole): Promise<UserRole> {
    return this.db.insert<UserRole>('user_roles', userRole);
  }

  public async getUserRoleById(id: number): Promise<UserRole | undefined> {
    return this.db.queryOne<UserRole>(
      'SELECT * FROM user_roles WHERE id = $1',
      [id]
    );
  }

  public async updateUserRole(id: number, userRole: Partial<UserRole>): Promise<UserRole | undefined> {
    return this.db.update<UserRole>('user_roles', id, userRole);
  }

  public async deleteUserRole(id: number): Promise<boolean> {
    return this.db.delete('user_roles', id);
  }

  public async getAllUserRoles(): Promise<UserRole[]> {
    return this.db.query<UserRole>('SELECT * FROM user_roles');
  }

  public async getUserRolesByUserId(userId: number): Promise<UserRole[]> {
    return this.db.query<UserRole>(
      'SELECT * FROM user_roles WHERE user_id = $1',
      [userId]
    );
  }

  public async getUsersByRoleId(roleId: number): Promise<UserRole[]> {
    return this.db.query<UserRole>(
      'SELECT * FROM user_roles WHERE role_id = $1',
      [roleId]
    );
  }

  public async checkUserRoleExists(userId: number, roleId: number): Promise<boolean> {
    return this.db.exists('user_roles', { user_id: userId, role_id: roleId });
  }

  private createApiError(statusCode: number, message: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }
} 