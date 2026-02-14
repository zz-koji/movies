import { Test } from "@nestjs/testing";
import { MoviesService } from "./movies.service";
import { Kysely } from "kysely";
import { Database } from "src/database/types";
import { LocalMovie } from "./types";

type MockedMoviesDatabase = Pick<Kysely<Database>, 'selectFrom' | 'insertInto' | 'updateTable' | 'deleteFrom'>;

describe('MoviesService', () => {
    let service: MoviesService;
    const mockDb: MockedMoviesDatabase = {
        selectFrom: jest.fn().mockReturnThis(),
        insertInto: jest.fn().mockReturnThis(),
        updateTable: jest.fn().mockReturnThis(),
        deleteFrom: jest.fn().mockReturnThis(),
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [MoviesService],
        }).compile();

        service = module.get<MoviesService>(MoviesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});