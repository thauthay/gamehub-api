import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  genre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider!: string;
}
