import { Module } from '@nestjs/common';
import { EncompassingQueryService } from './encompassing-query.service';

@Module({
  providers: [EncompassingQueryService],
  exports: [EncompassingQueryService],
})
export class KnowledgeGraphQueriesModule {}
