import { Role } from '../interfaces/role.interface';
import { DatabaseService } from '../services/database.service';
import { ApiError } from '../middlewares/error.middleware';

export class RoleModel {
  private static instance: RoleModel;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): RoleModel {
    if (!RoleModel.instance) {
      RoleModel.instance = new RoleModel();
    }
    return RoleModel.instance;
  }

  public async createRole(role: Role, userId?: number): Promise<Role> {
    return this.db.insert<Role>('roles', role, userId);
  }

  public async getRoleById(id: number): Promise<Role | undefined> {
    return this.db.queryOne<Role>(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
  }

  public async updateRole(id: number, role: Partial<Role>, userId?: number): Promise<Role | undefined> {
    return this.db.update<Role>('roles', id, role, userId);
  }

  public async deleteRole(id: number, userId?: number): Promise<boolean> {
    return this.db.delete('roles', id, userId);
  }

  public async getAllRoles(): Promise<Role[]> {
    return this.db.query<Role>('SELECT * FROM roles ORDER BY name');
  }

  public async getRoleByName(name: string): Promise<Role | undefined> {
    return this.db.queryOne<Role>(
      'SELECT * FROM roles WHERE name = $1',
      [name]
    );
  }

  public async checkRoleExists(name: string): Promise<boolean> {
    return this.db.exists('roles', { name });
  }

  public async getUsersByRole(roleId: number): Promise<Array<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone?: string;
    is_active: boolean;
    created_at: Date;
  }>> {
    return this.db.query<{
      id: number;
      username: string;
      email: string;
      full_name: string;
      phone?: string;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active, u.created_at
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE ur.role_id = $1
       ORDER BY u.username`,
      [roleId]
    );
  }

  private createApiError(statusCode: number, message: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }
} 