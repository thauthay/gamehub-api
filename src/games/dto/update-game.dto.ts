import { PartialType } from '@nestjs/mapped-types';
import { CreateGameDto } from './create-game.dto';

// Todos os campos do create, porém opcionais. O status NÃO entra aqui:
// ele muda apenas pelo endpoint dedicado, que aplica a regra de domínio.
export class UpdateGameDto extends PartialType(CreateGameDto) {}
