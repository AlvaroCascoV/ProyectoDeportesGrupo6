import { TestBed } from '@angular/core/testing';

import { PrecioActividadService } from './precio-actividad.service';

describe('PrecioActividadService', () => {
  let service: PrecioActividadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrecioActividadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
