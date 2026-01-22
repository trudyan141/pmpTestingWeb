import { Controller, Get, Param, Res, Query, NotFoundException } from '@nestjs/common';
import { TestsService } from './tests.service';
import { Response } from 'express';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  async findAll() {
    return this.testsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const test = await this.testsService.findOne(id);
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  @Get(':id/questions')
  async getQuestions(@Param('id') id: string) {
    return this.testsService.getQuestions(id);
  }

  @Get(':id/download-pdf')
  async exportPdf(
    @Param('id') id: string,
    @Query('includeExplanation') includeExplanation: string,
    @Query('onlyCorrect') onlyCorrect: string,
    @Res() res: Response,
  ) {
    const test = await this.testsService.findOne(id);
    if (!test) throw new NotFoundException('Test not found');

    const pdfBuffer = await this.testsService.generatePdf(
      id,
      includeExplanation === 'true',
      onlyCorrect === 'true',
    );

    const dateStr = new Date().toISOString().split('T')[0];
    const safeTestName = (test.testName || 'Test').replace(/[^a-z0-9]/gi, '_');
    const safeTopic = (test.topic || '').replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeTestName}${safeTopic ? `_${safeTopic}` : ''}_${dateStr}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get(':id/export.json')
  async exportJson(@Param('id') id: string) {
    return this.testsService.exportJson(id);
  }
}
