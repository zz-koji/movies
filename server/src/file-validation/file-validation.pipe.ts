import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { extname } from 'path';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    const acceptedFileTypes = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.avchd']

    const fileName = extname(value.originalname).toLowerCase()
    if (acceptedFileTypes.includes(fileName)) {
      return value
    }
    else {
      throw new BadRequestException(`Invalid file type. Allowed extensions: ${acceptedFileTypes}`)
    }
  }
}
