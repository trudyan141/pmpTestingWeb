import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { SelectorMap } from '@repo/shared';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; domainPattern: string }) {
    return this.profilesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { selectorMap?: SelectorMap }) {
    return this.profilesService.update(id, body);
  }
}
