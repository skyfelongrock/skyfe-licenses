# Skyfe — GitHub cihaz yetkilendirme

Bu repository Skyfe Boss Timer'ın onaylı cihaz listesini saklar ve GitHub Actions üzerinde Ed25519 ile imzalar. Pages, yerel Git veya yerel License Admin gerekmez.

## Günlük kullanım

`Actions → Skyfe - Cihaz Yonetimi → Run workflow`

- `Cihaz ekle`: uygulamadan kopyalanan tam Device Code'u yapıştır.
- `Cihaz kaldir`: aynı kodu listeden kaldır.
- `Listeyi yenile`: cihazları değiştirmeden imzalı dosyanın tarihini yenile.
- `Ilk kurulum`: yalnız ilk kurulum için. Mevcut anahtar ve liste varsa onları korur; anahtar döndürme aracı değildir.

Varsayılan branch'i seç. İşlem yeşil onay almadan art arda ikinci bir işlem başlatma. Bir bekleyen workflow başka bekleyen workflow tarafından değiştirilebilir; GitHub concurrency kuyruğu kalıcı iş kuyruğu değildir.

## Üretilen public dosyalar

```text
allowed-devices.json
public_key.txt
published/devices.signed.json
published/client_config.json
```

`published/client_config.json` yalnız PUBLIC key ve dağıtım ayarlarını içerir; EXE üretimi için paylaşılabilir. EXE bu public key'i derlenirken sabitler. Son kullanıcı EXE'si repository'den key indirip otomatik güvenmez.

`SKYFE_SIGNING_SEED` Actions Secret'tır. Public dosyalara, loglara veya artifactlere yazılmaz. Müşteri adını, e-posta adresini, donanım seri numaralarını, tokenları, `.dat` dosyalarını ve uygulamanın özel kaynak kodunu bu repository'ye yükleme.

## Anahtar/cihaz izinleri

Cihazlar açıkça kaldırılana kadar izin listesinde kalır. İmzalı listenin kendisi 7 gün geçerlidir ve workflow her gün `05:17 UTC` civarında yeniden imzalar. Bu, cihaz lisansının 7 günde bitmesi değildir. GitHub'ın zamanlanmış işleri gecikebilir/devre dışı kalabilir; gerektiğinde `Listeyi yenile` çalıştır.

Kaldırılan bir cihazın eski imzalı bir listeyle kabul edilme riskini sınırlandırmak için süre ve revision kontrolü vardır. Bu mutlak DRM değildir. Eski imzalı cevaplar, istemci saati/cache sıfırlama ve EXE patch'leme gibi sınırlar ayrıca dikkate alınır.

## Başlangıç

Ayrıntılı başlangıç rehberi: `README_TR.md`.

Kurulum tokenı sadece `Ilk kurulum` sırasında secret'ı kaydetmek için kullanılır. Günlük cihaz yönetimi Actions'ın kendi `GITHUB_TOKEN` yetkisiyle public dosyaları commit eder. Başlangıçtan sonra geçici tokenı sil/revoke et; **SKYFE_SIGNING_SEED'i silme**.
