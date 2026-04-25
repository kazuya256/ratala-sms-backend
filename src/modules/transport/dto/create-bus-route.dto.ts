import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateBusRouteDto {
    @IsString()
    routeName: string;

    @IsString()
    vehicleNumber: string;

    @IsString()
    driverName: string;

    @IsString()
    driverPhone: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    stops?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
