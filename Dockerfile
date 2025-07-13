# Use official PHP Apache image
FROM php:8.2-apache

# Enable mod_rewrite if needed
RUN a2enmod rewrite

# Copy all files to Apache root
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html


