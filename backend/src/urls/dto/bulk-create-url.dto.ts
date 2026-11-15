import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUrlDto } from './create-url.dto';

export class BulkCreateUrlDto {
  @IsArray({ message: 'urls must be an array of link objects' })
  @ArrayMinSize(1, { message: 'Must provide at least 1 URL to shorten' })
  @ArrayMaxSize(100, { message: 'Maximum 100 URLs can be shortened in a single batch' })
  @ValidateNested({ each: true })
  @Type(() => CreateUrlDto)
  urls: CreateUrlDto[];
}

