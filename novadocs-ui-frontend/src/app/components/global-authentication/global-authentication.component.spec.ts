import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalAuthenticationComponent } from './global-authentication.component';

describe('GlobalAuthenticationComponent', () => {
  let component: GlobalAuthenticationComponent;
  let fixture: ComponentFixture<GlobalAuthenticationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalAuthenticationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalAuthenticationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
