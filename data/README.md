# Base IP2Location DB5

Loja Segura uses the IP2Location LITE database for [IP geolocation](https://www.ip2location.com).

O arquivo necessário é `IP2LOCATION-LITE-DB5.BIN`. No material da disciplina,
ele está em `ip2location/ip2location/`. O ZIP de código não o redistribui:
os [termos publicados](https://lite.ip2location.com/data-license) incluem uma
restrição de redistribuição do produto, e não foi fornecida autorização específica
para incorporar a BIN ao pacote. A base original foi preservada.

Com os anexos extraídos na pasta irmã descrita no README, execute na pasta do projeto:

```powershell
pnpm.cmd run setup --bin "../trabalho-seguranca-anexos/ip2location/ip2location/IP2LOCATION-LITE-DB5.BIN"
```

O setup copia a base para `data/` sem sobrescrever um arquivo existente.
Alternativamente, copie a BIN manualmente para esta pasta e execute `pnpm.cmd run setup`.
Se os anexos não estiverem disponíveis, obtenha a edição **LITE DB5 em formato BIN**
no [site oficial](https://www.ip2location.com/database/lite), observando seus termos.

País/região/cidade e coordenadas são aproximados; DB5 não fornece ASN/organização.
A base não é atualizada automaticamente. Com dependências e BIN preparadas, a
consulta da aplicação é local e não exige serviço externo.
