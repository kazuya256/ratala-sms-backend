import { PartialType } from '@nestjs/mapped-types';
import { CreateBusRouteDto } from './create-bus-route.dto.js';

export class UpdateBusRouteDto extends PartialType(CreateBusRouteDto) {}
