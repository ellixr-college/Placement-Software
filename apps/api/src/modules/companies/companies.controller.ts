import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { CompaniesService } from './companies.service';
import {
  CreateCompanyDto,
  CreateContactDto,
  ListCompaniesQuery,
  UpdateCompanyDto,
  UpdateContactDto,
} from './dto';

@Controller('companies')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListCompaniesQuery) {
    const { items, meta } = await this.companies.list(this.collegeId(user), query);
    return { data: items, meta };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.companies.findOne(this.collegeId(user), id) };
  }

  @Get(':id/hiring-history')
  async hiringHistory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.companies.hiringHistory(this.collegeId(user), id) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCompanyDto) {
    return { data: await this.companies.create(this.collegeId(user), dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return { data: await this.companies.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.companies.remove(this.collegeId(user), id) };
  }

  @Post(':id/contacts')
  async addContact(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ) {
    return { data: await this.companies.addContact(this.collegeId(user), id, dto) };
  }

  @Patch(':id/contacts/:contactId')
  async updateContact(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return {
      data: await this.companies.updateContact(this.collegeId(user), id, contactId, dto),
    };
  }

  @Delete(':id/contacts/:contactId')
  async removeContact(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return {
      data: await this.companies.removeContact(this.collegeId(user), id, contactId),
    };
  }
}
