import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: any;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ResponseUtil {
  static success<T = any>(
    data: T,
    message: string = 'Operation successful',
    statusCode: number = HttpStatus.OK,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static created<T = any>(
    data: T,
    message: string = 'Resource created successfully',
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: any,
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  static badRequest(message: string, errors?: any): ApiResponse {
    return this.error(message, HttpStatus.BAD_REQUEST, errors);
  }

  static unauthorized(message: string = 'Unauthorized access'): ApiResponse {
    return this.error(message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message: string = 'Forbidden resource'): ApiResponse {
    return this.error(message, HttpStatus.FORBIDDEN);
  }

  static notFound(message: string = 'Resource not found'): ApiResponse {
    return this.error(message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string): ApiResponse {
    return this.error(message, HttpStatus.CONFLICT);
  }

  static paginated<T = any>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully',
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
