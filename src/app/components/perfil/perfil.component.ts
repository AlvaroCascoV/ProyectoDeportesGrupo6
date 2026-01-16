import { Component, OnInit } from '@angular/core';
import { Alumno } from '../../models/Alumno';
import { PerfilService } from '../../services/perfil/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit{
  public usuario!: Alumno;
  
  constructor(private _servicioPerfil: PerfilService){}

  ngOnInit(): void {
    let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VyRGF0YSI6IlhmNVA0ZmhwRFZJa2w4SXVDSjdYdVppdWZ0cGZBeFB2ckFHRi9sNzYySVp3S1ZrWVc1S2tVM3JONkxKZjl6KzdEd3J1L2NVbkczSHlMZ1pkSUM1V0t1SUpqZGd3c1B6VWJiL004SkQ1cmhxdExPS1RMaEJlaXNtM05NSDZoa3IyQzJXZWlTNzlYZDQya1luYW83K0ZnbDV2bUZUcFBuNXB6Uk5KSnFvYzA0WSt0cUdZdmU2bElvMUVTaTM1Q3M3N2RmdzhOWU05ZFlXc0tPV0htU0NIYUc1WW40NGFsRXpUekdBUFprUm11eE45RDgvb2xreGptTU95ZmRWTnFaKzFNQUJjTmFESmZDc3BpNWxyZmF0WnpJNVNtQkp4RWFFaEU3TjQ2WlRZSUFMcUE5SzMvVjJhQ2hNajBXVzNTZ09IRFg0c0FDZDlVcXNxdDBCZk5ubmhYMm5NcXR3ek8zclZ6T0IycWJrdDdjSjE2endOekJ3dU13ejJvdEt1S3hBd2JlbmwrQVdzZWRGNkhWSElRYjB2cE42bmNVbmhtSGpNRnBVK0lFeUZmZDg9IiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiQUxVTU5PIiwibmJmIjoxNzY4NTUwNzEwLCJleHAiOjE3Njg1NjUxMTAsImlzcyI6Imh0dHBzOi8vbG9jYWxob3N0OjcwMzIvIiwiYXVkIjoiQXBpRGVwb3J0ZXNUYWphbWFyQ29yZU9BdXRoIn0.jekOw68BYXjmH42riHlCDwTNHPUMHTp7LIN-qNz63m0"
    this._servicioPerfil.getPerfil(token).subscribe(response => {
      this.usuario = response;
      localStorage.setItem("userID", (response.idUsuario).toString());
      console.log("Usuario: "+JSON.stringify(this.usuario))
    })
  }
}
