import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TaxReportQueryDto {
  @IsInt() @Type(() => Number) accountId: number;
  @IsIn(['tax', 'calendar']) period: 'tax' | 'calendar';
  @IsInt() @Min(2000) @Max(2100) @Type(() => Number) year: number;
}

export class TaxMappingQueryDto {
  @IsInt() @Type(() => Number) accountId: number;
}

export class SaveTaxMappingDto {
  @IsInt() @Type(() => Number) accountId: number;
  /** { [categoryId]: head } */
  @IsObject() heads: Record<string, string>;
}
