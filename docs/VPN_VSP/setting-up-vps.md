
# Setting Up your VSP

## Rent and set up the server

1. Create an account with a provider.

For this example, sign up at Vultr: [https://my.vultr.com/deploy-beta/](https://my.vultr.com/deploy-beta/). New accounts often come with promotional credit, though the amount changes over time, so check what is currently offered.

2. Start a new server.

Choose the Cloud Compute (shared) option. This is the standard, affordable VPS.

3. Pick a plan.

Vultr's cheapest plans change often and come with catches, so pick with care:

-   The very cheapest plan (around $2.50 per month) is available only in a few locations and is IPv6-only, meaning some services will not reach it. Avoid this for a normal website.
    
-   A better starting point is the roughly $5 per month plan with 1GB RAM, which is widely available and has enough resources for a real site.
    

For a first website, the 1GB plan is the practical choice.

4. Choose a location.

Pick a data center close to the people who will use your site.

5. Choose the operating system.

Select Debian. Debian is the classic, rock-solid choice for servers.

Note: older guides often say "Debian 11." Debian 11 is now reaching the end of its security support, so choose the current version, Debian 13 ("Trixie"), which is supported into 2028. If you use a different version or a different Linux entirely, the steps below still apply, but some details may vary slightly.

6. Set the additional features.

-   Automatic backups: you can turn this off to save a little money each month. You can always take a manual snapshot for free when you need one. (If your site becomes important, consider turning backups back on later.)
    
-   Enable IPv6: turn this on.
    
-   Keep IPv4 enabled: leave this on, since most things still need it.
    

7. Deploy the server.

Confirm and create it. Wait until the status shows the server is running.

  

# Self-Hosting a Website on a VPS

This guide provides the steps for setting up a simple website on your own server.

It uses

-   VPS Provider: Vultr
    
-   Domain Name Registrar: GoDaddy, and
    
-   Server: Debian Linux on the server
    

The same ideas apply to other providers and registrars, with minor differences in the menus.

You do not need to be an expert. You will mostly be copying and pasting a handful of commands.

1.  ## Point your domain at the server (DNS)
    

DNS is the system that connects your domain name (like example.com) to your server's address. You set this up at your domain registrar.

8. Find your server's addresses.

In Vultr, open your server's details page. Note down two things:

-   The IPv4 address (looks like 45.63.9.32)
    
-   The IPv6 address (looks like 2001:19f0:1000:e1f4:5400:05ff:fec5:d935), which you will find under the IPv6 tab in the server's settings
    

9. Open your domain's DNS settings.

Log in to your registrar (for example, GoDaddy), click your domain, and open the DNS records section. If the registrar has added default records, you can delete them so you start with a clean slate.

10. Add records that point to your server.

Add the following records:

-   A record, Host @, value = your IPv4 address. This points your bare domain (example.com) to your server.
    
-   A record, Host *, value = your IPv4 address. The * is a wildcard that sends every subdomain (like mail.example.com or blog.example.com) to the same place.
    
-   AAAA record, Host @, value = your IPv6 address. This is the IPv6 equivalent of the first record.
    
-   AAAA record, Host *, value = your IPv6 address. The IPv6 wildcard.
    

11. Save all records.

12. Test that it worked.

DNS changes can take anywhere from a few minutes to a few hours to spread across the internet. Once ready, open a terminal on your own computer and run:

ping example.com

If the replies come from your server's IP address, your DNS is working. You can also run host example.com, which lists both the IPv4 and IPv6 addresses your domain now points to.

  

2.  ## Connect to your server
    

1.  Get your login details.
    

In Vultr, your server's page shows a root password. Copy it.

2.  Log in over SSH.
    

On your own computer, open a terminal and connect (replace example.com with your domain, or use the server's IP address):

ssh root@example.com

Paste the password when asked. (You will not see the characters as you paste. That is normal.)

3.  Update the system.
    

Once you are logged in, bring everything up to date:

apt update

apt upgrade

## 3. Install the web server

Install nginx.

Nginx is the software that serves your website to visitors:

apt install nginx

## 4. Create your website

1.  Create a folder for your site's files.
    

mkdir /var/www/mysite

If you see a message that /var/www/ already exists, ignore it, that is fine.

2.  Create the home page.
    

nano /var/www/mysite/index.html

Paste in some simple content, for example:

html

<!DOCTYPE  html>

<h1>Hello World!</h1>

<p>I am your website. Thank you for making me.</p>

Save and exit nano by pressing Ctrl + X, then Y, then Enter.

3.  Create the nginx configuration for your site.
    

nano /etc/nginx/sites-available/mysite

Paste in the following, replacing example.org with your domain and mysite with your folder name:

nginx

server {

listen 80;

listen [::]:80;

server_name example.org;

root /var/www/mysite;

index index.html index.htm;

  

location / {

try_files $uri $uri/ =404;

}

}

Save and exit (Ctrl + X, then Y, then Enter).

4.  Turn your site on.
    

Link your new configuration into the folder of active sites:

ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/

5.  Check the configuration and restart nginx.
    

nginx -t

systemctl restart nginx

If nginx -t reports "syntax is ok" and "test is successful," you are good. Visit http://example.com in a browser and you should see your page.

## 5. Add HTTPS (the padlock) for free

HTTPS encrypts the connection between your site and its visitors. Certbot sets this up for free using Let's Encrypt.

Install Certbot.

apt install certbot python3-certbot-nginx

Get and install the certificate.

Run this, listing your domain and its www version:

certbot --nginx -d example.com -d www.example.com

Certbot will ask a couple of simple questions and then automatically update your nginx setup to use HTTPS. After it finishes, your site will work at https://example.com.

## Troubleshooting

You see the default nginx welcome page instead of your site.

This means nginx is still serving its built-in default site. Fix it like this.

First, see which sites are active:

ls -la /etc/nginx/sites-enabled/

If a default site is listed, remove it:

rm /etc/nginx/sites-enabled/default

Confirm your own site is still active:

ls -la /etc/nginx/sites-enabled/mysite

Then reload nginx:

systemctl restart nginx

Reload http://example.com and your real site should appear.

You edited the main nginx config and it complains about server names.

If nginx -t warns about server_names_hash_bucket_size, open the main config:

nano /etc/nginx/nginx.conf

Find the line containing server_names_hash_bucket_size, remove the # at the start to uncomment it, then save, and run nginx -t and systemctl restart nginx again.

Leftover DNS records from an old host.

If your domain used to be hosted somewhere else, go back into your registrar's DNS settings and delete any old records pointing to the previous host, so nothing conflicts with your new server.

----------

That is a complete, working, self-hosted website on a server you fully control, reachable at your own domain and secured with HTTPS.