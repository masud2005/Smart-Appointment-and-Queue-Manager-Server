import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ResponseUtil } from '@/utils';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return ResponseUtil.success(user, 'User profile retrieved successfully');
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        name: updateData.name || user.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ResponseUtil.success(updatedUser, 'Profile updated successfully');
  }

  async deleteProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.client.user.delete({
      where: { id: userId },
    });

    return ResponseUtil.success(null, 'Profile deleted successfully');
  }
}
