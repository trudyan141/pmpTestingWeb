import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { StartCrawlRequest } from '@repo/shared';

@Controller('crawl')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('start')
  startCrawl(@Body() body: StartCrawlRequest) {
    return this.crawlerService.startCrawl(body);
  }

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    const job = this.crawlerService.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };
    return job;
  }

  @Post(':jobId/cancel')
  cancelJob(@Param('jobId') jobId: string) {
    return this.crawlerService.cancelJob(jobId);
  }

  @Post(':jobId/next')
  advanceJob(@Param('jobId') jobId: string, @Body() body: { selectionId: string }) {
    return this.crawlerService.advanceJob(jobId, body.selectionId);
  }

  @Post(':jobId/scan-review')
  scanReview(@Param('jobId') jobId: string, @Body() body: { topic?: string; testName?: string }) {
    return this.crawlerService.scanReviewPage(jobId, body.topic, body.testName);
  }
}
