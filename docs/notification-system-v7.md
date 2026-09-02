# VOYNU notification system v7

Notification delivery is intentionally app-scoped.

- Customer notifications use the customer audience.
- Driver notifications use the driver audience.
- Admin notifications use the admin audience.
- Android/Samsung web notifications use the monochrome VOYNU V as the notification `icon` on the left.
- The Web Notification `badge` option is intentionally not used because Samsung renders it separately on the right.
- Notification copy is normalized by notification type so old database notification wording is also presented consistently.
