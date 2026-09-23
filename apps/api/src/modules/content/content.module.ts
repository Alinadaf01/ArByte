import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({
  imports: [CatalogModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
