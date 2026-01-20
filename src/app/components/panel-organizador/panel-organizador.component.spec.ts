import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelOrganizadorComponent } from './panel-organizador.component';

describe('PanelOrganizadorComponent', () => {
  let component: PanelOrganizadorComponent;
  let fixture: ComponentFixture<PanelOrganizadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PanelOrganizadorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelOrganizadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
