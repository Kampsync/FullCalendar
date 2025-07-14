# Use the official PHP image with Apache
FROM php:8.2-apache

# Copy your PHP files into the Apache document root
COPY . /var/www/html/

# Expose a custom port (8081)
EXPOSE 8081

# Change Apache to listen on port 8081 (Cloud Run requirement for custom port)
RUN sed -i 's/80/8081/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf

# (Optional) Enable Apache mod_rewrite if you need it
RUN a2enmod rewrite 


