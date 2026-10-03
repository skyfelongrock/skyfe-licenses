# Skyfe GitHub Lisans Kurulumu — v0.1.0

**Hedef depo:** `skyfelongrock/skyfe-licenses`  
**Ürün tarafı:** Skyfe Boss Timer 1.1.0 için altyapı.  
**Bu pakette:** public repository dosyaları, imzalayıcı, workflow, testler ve kılavuz.  
**Henüz yok:** senin GitHub hesabında çalıştırılmış kurulum; GitHub'ın üreteceği public key'e sabitlenmiş son EXE.

Bu paketi bağlı `hawx07` hesabıyla depoya göndermiyoruz. İşlemleri repo sahibinin/yetkili hesabınla tarayıcıdan yapacaksın. Hesap parolası, token veya özel anahtar sohbet üzerinden paylaşılmaz.

## Ne kuruyoruz?

```text
Kullanıcı EXE'de giriş ifadesini doğrular
→ cihaz kodunu salt okunur alanda görür
→ KOPYALA ile sana gönderir
→ sen GitHub Actions formuna yapıştırıp Cihaz ekle dersin
→ Actions imzalı listeyi günceller
→ EXE imzayı ve cihaz eşleşmesini doğrular
→ ancak sonra Normal/DEV launcher açılır
```

Son kullanıcı talebindeki giriş ifadesi `azanakaskyfe`dir. Önceki `skyfeazakana` ifadesiyle karıştırılmamalıdır. Bu ortak ifade tek başına lisans güvenliği değildir.

# 1. ZIP'i çıkar

Yalnız `repository` klasörünün **içeriği** public GitHub deposuna gidecek.

```text
repository/
  README.md
  README_TR.md
  .gitignore
  scripts/
    license-core.mjs
    license-admin.mjs
    license-core.test.mjs
  .github/
    workflows/
      skyfe-license.yml
```

ZIP dosyasını GitHub'a yüklemek, içindeki workflow'u kurmaz. Dosyaları çıkarmalısın. `tests_local`, TEST_REPORT, devam notu veya eski Boss Timer source ZIP'lerini public repoya koymana gerek yok.

# 2. Normal dosyaları tarayıcıdan yükle

1. GitHub'da `skyfelongrock/skyfe-licenses` deposunu aç.
2. Doğru hesabınla oturum açtığını kontrol et.
3. Repo boşsa **uploading an existing file** bağlantısını kullan. Doluysa **Add file → Upload files**.
4. `repository` içinden `README.md`, `README_TR.md` ve **scripts klasörünü** sürükleyip bırak.
5. **Commit changes** ile varsayılan branch'e kaydet.
6. Repoda `scripts/license-admin.mjs` yolunun oluştuğunu kontrol et. Yanlışlıkla `repository/scripts/...` olmamalı.

`.gitignore`u da normal dosya olarak yükleyebilirsin. Bu dosya bir güvenlik sınırı değildir; özel dosyaları zaten yüklemeyeceksin.

# 3. Workflow dosyasını doğru yere koy

`.github` klasörü bazı dosya seçicilerde görünmeyebilir. En anlaşılır yöntem:

1. Depoda **Add file → Create new file**.
2. Dosya adı alanına tam şunu yaz:
   `.github/workflows/skyfe-license.yml`
3. Pakette aynı isimdeki dosyayı Not Defteri ile aç.
4. Dosyanın tüm metnini GitHub editörüne yapıştır.
5. **Commit changes**.
6. **Actions** sekmesine gir. İstenirse workflow'ları etkinleştir.
7. Sol listede **Skyfe - Cihaz Yonetimi** görünmeli.

Workflow default branch'te olmalıdır. Branch adı `main` veya `master` olabilir. Paket branch adını GitHub'dan alır; bu adı değiştirmene gerek yok. Başka bir branch'te Run workflow seçersen iş güvenli biçimde çalışmaz.

# 4. Bir defalık kurulum yetkisi oluştur

Actions'ın günlük tokenı dosyaları commit edebilir, fakat kendi başına repository secret'ı oluşturması için gereken yetkiye sahip değildir. Bu yüzden sadece ilk anahtarı oluşturup GitHub Secret'a koyarken kısa ömürlü bir fine-grained token kullanıyoruz.

1. GitHub sağ üst profil fotoğrafın → **Settings**.
2. Sol menü en alt → **Developer settings**.
3. **Personal access tokens → Fine-grained tokens → Generate new token**.
4. Token adı: `Skyfe one-time setup`.
5. Expiration: örneğin **7 gün**. Süresiz seçme.
6. Resource owner: bu repository'nin sahibi hesabı seç.
7. Repository access: **Only select repositories** → yalnız `skyfe-licenses`.
8. Repository permissions → **Secrets: Read and write**.
9. Metadata read otomatik gelebilir; normaldir. Contents/Administration/Workflows gibi başka izinleri bu tokena eklemene gerek yok.
10. **Generate token**. Üretilen değeri kopyala.

Tokenı bana, README'ye, workflow input alanına veya public dosyaya yapıştırma.

# 5. Tokenı repository secret olarak kaydet

1. Tekrar `skyfelongrock/skyfe-licenses` deposuna dön.
2. **Settings → Secrets and variables → Actions**.
3. **New repository secret**.
4. Name: `SKYFE_SETUP_TOKEN`.
5. Secret: az önce kopyaladığın token.
6. **Add secret**.

`SKYFE_SIGNING_SEED`i sen elle oluşturma. Onu ilk workflow çalışması oluşturacak. Eski License Admin'in `signing_key.dat` dosyasını buraya koyma.

# 6. İlk kurulumu çalıştır

1. **Actions → Skyfe - Cihaz Yonetimi**.
2. **Run workflow**.
3. Branch: varsayılan branch, örneğin `master`.
4. operation: **Ilk kurulum**.
5. device_code: **boş bırak**.
6. Yeşil **Run workflow** düğmesine bas.
7. Açılan çalışmayı tıkla; yeşil onay bekle.

Bu aşamada GitHub runner'ı rastgele bir Ed25519 özel anahtar oluşturur. Değer GitHub'a secret olarak şifrelenerek gönderilir; repo dosyasına veya loga yazılmaz. Yalnız public key ve başlangıçtaki boş, imzalı cihaz listesi yayımlanır.

Başarılı çalışmada repoda şunlar oluşur:

```text
allowed-devices.json
public_key.txt
published/devices.signed.json
published/client_config.json
```

Repository secret listesinde `SKYFE_SIGNING_SEED` ismi görünür. Secret değerini açıp paylaşman gerekmez.

## İlk kurulum yarıda kalırsa

Yeni anahtar oluşturmak için secret'ı silme. Aynı **Ilk kurulum** işlemini yeniden çalıştır. Mevcut secret kullanılarak yayın tamamlanır. Mevcut public key ile secret uyuşmazsa otomatik değiştirmek yerine hata verir.

# 7. Kurulumun çalıştığını ikinci kez doğrula

1. Aynı workflow → Run workflow.
2. operation: **Listeyi yenile**.
3. device_code boş.
4. Yeşil sonuç bekle.
5. `public_key.txt` aynı kalmalı, listede revision yükselmeli.

Bu ikinci işlem, kalıcı signing secret'ın bir sonraki workflow tarafından okunabildiğini gösterir.

# 8. Geçici tokenı kapat

İlk kurulum + Listeyi yenile yeşil olduktan sonra:

1. Repository **Settings → Secrets and variables → Actions**.
2. Yalnız `SKYFE_SETUP_TOKEN`u sil.
3. Hesap **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
4. `Skyfe one-time setup` tokenını sil/revoke et.
5. **SKYFE_SIGNING_SEED KALACAK.**

Normal cihaz ekleme/kaldırma bu PAT'e ihtiyaç duymaz. `GITHUB_TOKEN`u sen oluşturmazsın; Actions kendisi sağlar.

# 9. Son EXE için paylaşılacak tek dosya

`published/client_config.json` dosyasını açıp içeriğini veya dosyayı paylaş.

Bu dosya:
- gerçek default branch,
- Raw manifest URL'si,
- Ed25519 PUBLIC key,
- public key fingerprint,
- protokol ayarlarını içerir.

**Public dosyadır, paylaşılabilir. Özel signing seed değildir.**

Bu anahtar EXE'nin içine build sırasında sabitlenir. Final EXE'yi henüz bilinmeyen bir public key'e güveniyormuş gibi dağıtmayacağız. İstemci dışarıdaki `public_key.txt`i indirip kendiliğinden güvenmez.

# 10. Günlük kullanım — cihaz ekle

Son EXE hazır olduğunda kullanıcıda:

```text
Lisans anahtarı [yazılabilir] [YAPIŞTIR] [DOĞRULA]
Doğruysa: Anahtar geçerli
Cihaz kodu [salt okunur, tam kod] [KOPYALA]
Durum: Yetkilendirme bekleniyor
[KONTROL ET]
```

Planlanan otomatik bekleme kontrolü 30 saniyede birdir. Cihaz listede değilken ana launcher/DEV ekranı açılmaz. Kodun ekranda değiştirilememesi, donanım kimliğinin teknik olarak asla taklit edilemeyeceği anlamına gelmez.

Yönetici olarak:

1. Kullanıcıdan tam Device Code'u al.
2. **Actions → Skyfe - Cihaz Yonetimi → Run workflow**.
3. operation: **Cihaz ekle**.
4. device_code: tam kodu yapıştır.
5. **Run workflow**.
6. Yeşil sonucu bekle.

EXE, tek bir imzalı dosyayı indirir ve cihazın listede olup olmadığını kendi içinde kontrol eder. Kullanıcı EXE'si repoya yazmaz, GitHub tokenı taşımaz ve cihazı otomatik onaylamaz.

# 11. Cihazı kaldır

Aynı formda operation: **Cihaz kaldir**, device_code: tam kod. Listeden çıkarılır ve yeni manifest imzalanır.

Cihaz kodunu bulamazsan repodaki `allowed-devices.json` içindeki tam 64 hex kodu kullanabilirsin. Public repo müşteri isimleri/telefon/e-posta adresleri saklamak için kullanılmamalı.

Bu lisans kapısı launcher erişimini denetler. Önceden kurulmuş M3D'yi veya ayrı eski timer EXE'sini uzaktan durdurmaz ve oyunu kapatmaz.

# 12. Otomatik yenileme ve kesintiler

Workflow her gün 05:17 UTC civarında listeyi yeniden imzalar. İmzalı belge 7 gün geçerlidir; cihaz izinleri kendiliğinden 7 günde silinmez.

GitHub zamanlanmış işleri geciktirebilir; public depoda 60 gün etkinlik yoksa schedule kapatılabilir. Otomatik yenileme uzun süre durursa **Listeyi yenile**yi elle çalıştır ve schedule'ı yeniden etkinleştir. Bu bir sürekli çalışan sunucu değildir.

Açılışta GitHub'a ulaşılamıyor/manifest geçersiz/expired ise istemci yetki vermeyecektir. Uygulama açıkken online denetim, iptal, kısa ağ kesintisi ve cache davranışının Windows kabul testi final EXE ile ayrıca yapılacak.

# 13. Sık görülen hata kodları

| Hata | Yapılacak |
|---|---|
| `SETUP_TOKEN_MISSING` | SKYFE_SETUP_TOKEN repository secret'ını oluştur |
| `SETUP_TOKEN_INVALID` | Tokenın süresini/iptal durumunu kontrol et |
| `SETUP_TOKEN_PERMISSION_OR_API_ERROR` | Token repo seçimi ve Secrets read/write yetkisini kontrol et |
| `SIGNING_SECRET_SAVE_FAILED` | Aynı secret izinlerini ve GitHub Actions job hatasını kontrol et; değer paylaşma |
| `SIGNING_SECRET_EXISTS_RERUN_WORKFLOW` | Secret az önce oluşmuş olabilir; workflow'u tekrar çalıştır |
| `SIGNING_SECRET_MISSING_RUN_INITIALIZE` | İlk kurulum tamamlanmamış veya secret silinmiş |
| `KEY_RECOVERY_REQUIRED_PUBLIC_STATE_EXISTS` | Public key var ama private secret yok; anahtarı körlemesine yenileme |
| `SIGNING_KEY_MISMATCH_NO_ROTATION` | Secret ile yayımlanmış public key farklı; dur ve durumu incele |
| `PUBLIC_PUSH_FAILED_CHECK_PERMISSION_OR_NEW_COMMIT` | Actions contents-write/branch kuralları veya aynı anda yeni commit; düzelt ve tekrar çalıştır, force-push yapma |
| `DEVICE_CODE_INVALID` | Tam kodu kopyala; örnek kısa kodlar gerçek kod değildir |
| `DEFAULT_BRANCH_REQUIRED` | Varsayılan branch'te çalıştır |

Push izni engellenmişse repository Settings → Actions → General → Workflow permissions bölümünü kontrol et. İş contents:write ister; kuruluş politikası veya branch kuralı engelliyorsa bunu ilgili politikaya uygun düzeltmek gerekir. İlk denemede bütün korumaları kapatma.

# 14. Format/yedek ve eski Admin

Eski License Admin 0.1.1 ve test lisansları bu yeni sistemin parçası değildir. Eski uygulamayı kullanmak zorunda değilsin.

GitHub'daki `SKYFE_SIGNING_SEED` ve repository durduğu sürece kendi bilgisayarına format atman signing kimliğini değiştirmez. Ancak GitHub hesabı/secret kaybı ayrı bir risktir. Hesap kurtarma yöntemlerini tek Windows kurulumuna bağlama. Bu sistem 'hiçbir şey kaybolamaz' garantisi vermez.

# 15. Paket testleri ve sınırları

23 Node birim/politika testi ve 9 yerel Git entegrasyon testi bu ortamda geçti. Entegrasyonda add/remove/renew, varsayılan branch, yanlış anahtar, bozuk kod, eşzamanlı commit ve secret'ın yayımlanmaması sınandı.

Testlerde yalnız açıkça işaretlenmiş deterministik TEST seed'i kullanıldı. Bu seed gerçek signing secret olarak kullanılmamalıdır. Gerçek anahtar GitHub ilk kurulumunda rastgele üretilir.

GitHub secrets API'ye gerçek hesapla yazma ve gerçek hosted workflow testi burada yapılmadı. Üretim seed'i bu ortamda üretilmedi, GitHub'a bağlanan diğer hesaba yetki verilmedi ve çalışan M3D/EXE değiştirilmedi.

# Kaynaklar — 3 Ekim 2026 kontrolü

- GitHub: Manually running a workflow — https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- GitHub: Adding files from browser — https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- GitHub: Fine-grained tokens — https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub: REST secrets permissions — https://docs.github.com/en/rest/actions/secrets
- GitHub CLI: gh secret set — https://cli.github.com/manual/gh_secret_set
- GitHub: GITHUB_TOKEN permissions — https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub: Schedule limitations — https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- GitHub: Actions billing — https://docs.github.com/en/billing/concepts/product-billing/github-actions
