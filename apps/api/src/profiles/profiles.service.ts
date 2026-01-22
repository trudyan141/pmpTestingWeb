import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.siteProfile.findMany();
  }

  create(data: { name: string; domainPattern: string }) {
    return this.prisma.siteProfile.create({ data });
  }

  async update(id: string, data: any) {
    if (data.selectorMap && typeof data.selectorMap === 'object') {
        data.selectorMap = JSON.stringify(data.selectorMap);
    }
    return this.prisma.siteProfile.update({
      where: { id },
      data,
    });
  }
}
