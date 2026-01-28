# Apache VirtualHost Templates - Multi-Destination

## Overview
This directory contains Apache VirtualHost configuration templates for the multi-destination architecture.

## Available Templates

### Texel (texelmaps.nl)
- `texelmaps.nl.conf.template` - HTTP redirect
- `texelmaps.nl-le-ssl.conf.template` - HTTPS main site
- `admin.texelmaps.nl-le-ssl.conf.template` - HTTPS admin portal

### Alicante (alicante.holidaibutler.com)
- `alicante.holidaibutler.com.conf.template` - HTTP redirect
- `alicante.holidaibutler.com-le-ssl.conf.template` - HTTPS main site

## Deployment Steps

### 1. Copy templates to Apache (remove .template extension)
```bash
sudo cp texelmaps.nl.conf.template /etc/apache2/sites-available/texelmaps.nl.conf
sudo cp texelmaps.nl-le-ssl.conf.template /etc/apache2/sites-available/texelmaps.nl-le-ssl.conf
```

### 2. Create document root directories
```bash
sudo mkdir -p /var/www/texelmaps.nl
sudo mkdir -p /var/www/admin.texelmaps.nl
sudo mkdir -p /var/www/alicante.holidaibutler.com
sudo chown -R www-data:www-data /var/www/texelmaps.nl
sudo chown -R www-data:www-data /var/www/admin.texelmaps.nl
sudo chown -R www-data:www-data /var/www/alicante.holidaibutler.com
```

### 3. Enable required Apache modules
```bash
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl
```

### 4. Enable the sites (HTTP first for SSL setup)
```bash
sudo a2ensite texelmaps.nl.conf
sudo systemctl reload apache2
```

### 5. Obtain SSL certificates
```bash
sudo certbot --apache -d texelmaps.nl -d www.texelmaps.nl
sudo certbot --apache -d admin.texelmaps.nl
sudo certbot --apache -d alicante.holidaibutler.com
```

### 6. Enable SSL sites
```bash
sudo a2ensite texelmaps.nl-le-ssl.conf
sudo a2ensite admin.texelmaps.nl-le-ssl.conf
sudo a2ensite alicante.holidaibutler.com-le-ssl.conf
sudo systemctl reload apache2
```

### 7. Activate destinations in database
```sql
-- Activate Texel
UPDATE destinations SET is_active = 1 WHERE code = 'texel';

-- Activate Alicante
UPDATE destinations SET is_active = 1 WHERE code = 'alicante';
```

## Key Configuration Points

### X-Destination-ID Header
All templates include:
```apache
RequestHeader set X-Destination-ID "texel"
```
This tells the backend which destination is being accessed.

### Shared Backend
All destinations share the same Node.js backend (port 3001), differentiated by:
- X-Destination-ID header
- destination_id in database queries

### Destination-Specific Storage
Each destination has its own storage path:
```
/var/www/api.holidaibutler.com/storage/destinations/{destination}/poi-images
```

### CORS Configuration
Update CORS origins to match the destination domain:
```apache
Header always set Access-Control-Allow-Origin "https://texelmaps.nl"
```

## Testing

After deployment, verify:
1. HTTP redirects to HTTPS
2. Frontend loads correctly
3. API requests include X-Destination-ID header
4. POI images load from correct destination storage

```bash
# Test API with destination header
curl -H "X-Destination-ID: texel" https://texelmaps.nl/api/v1/pois
```

## Troubleshooting

### Check Apache logs
```bash
sudo tail -f /var/log/apache2/texelmaps_error.log
sudo tail -f /var/log/apache2/texelmaps_access.log
```

### Verify SSL
```bash
sudo certbot certificates
```

### Test config syntax
```bash
sudo apache2ctl configtest
```
