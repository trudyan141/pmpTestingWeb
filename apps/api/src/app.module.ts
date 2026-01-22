import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CrawlerModule } from './crawler/crawler.module';
import { TestsModule } from './tests/tests.module';
import { ProfilesModule } from './profiles/profiles.module';

@Module({
  imports: [
    PrismaModule,
    CrawlerModule,
    TestsModule,
    ProfilesModule,
  ],
})
export class AppModule {}
