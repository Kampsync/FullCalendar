# Use the official PHP image with Apache
FROM php:8.2-apache

# Copy your PHP files into the Apache document root
COPY . /var/www/html/

# Expose the default Cloud Run port (8080)
EXPOSE 8080

# Change Apache to listen on port 8080 (Cloud Run requirement)
RUN sed -i 's/80/8080/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf

# (Optional) Enable Apache mod_rewrite if you need it
RUN a2enmod rewrite 


