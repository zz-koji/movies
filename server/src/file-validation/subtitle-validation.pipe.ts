import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { extname } from 'path';

@Injectable()
export class SubtitleValidationPipe implements PipeTransform {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ACCEPTED_EXTENSION = '.srt';

  transform(value: Express.Multer.File | undefined, metadata: ArgumentMetadata) {
    // Allow undefined for optional subtitle uploads
    if (!value) {
      return value;
    }

    const fileExtension = extname(value.originalname).toLowerCase();

    if (fileExtension !== SubtitleValidationPipe.ACCEPTED_EXTENSION) {
      throw new BadRequestException(
        `Invalid subtitle file type. Only ${SubtitleValidationPipe.ACCEPTED_EXTENSION} files are allowed.`,
      );
    }

    if (value.size > SubtitleValidationPipe.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Subtitle file too large. Maximum size is ${SubtitleValidationPipe.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      );
    }

    return value;
  }
}
