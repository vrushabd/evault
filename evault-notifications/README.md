# evault-notifications

**Notification Service** for the **eVault** project — SIH 2026, Problem Statement SIH260229, Ministry of Law and Justice.

This is one independent microservice of the larger eVault microservices architecture. It handles email notifications and notification history for the eVault platform.

---

## What This Service Does

The Notification Service is responsible for:

1. Sending email alerts to users
2. Document sharing notifications
3. Access granted notifications
4. Access revoked notifications
5. Document amendment notifications
6. Document expiration notifications
7. Storing notification history in MySQL

The service exposes a REST API that is called by:
- **Document Service** — calls `POST /api/notifications/send` when an event occurs
- **Frontend** — calls `GET /api/notifications/user/{wallet}` and `PUT /api/notifications/{id}/read`

---

## Technology Used

| Technology | Purpose |
|---|---|
| Java 17 | Programming language |
| Spring Boot 3.2.5 | Application framework |
| Maven | Build tool |
| Spring Web | REST API |
| Spring Data JPA | Database access |
| MySQL | Notification history persistence |
| Spring Mail | Email sending |
| Thymeleaf | HTML email template rendering |

---

## Project Structure

```
evault-notifications/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── evault/
│   │   │           └── notifications/
│   │   │               ├── NotificationApplication.java
│   │   │               ├── controller/
│   │   │               │   └── NotificationController.java
│   │   │               ├── service/
│   │   │               │   ├── NotificationService.java
│   │   │               │   ├── EmailService.java
│   │   │               │   └── TemplateService.java
│   │   │               ├── repository/
│   │   │               │   └── NotificationRepository.java
│   │   │               ├── model/
│   │   │               │   └── Notification.java
│   │   │               ├── dto/
│   │   │               │   ├── NotificationRequest.java
│   │   │               │   └── NotificationResponse.java
│   │   │               ├── enums/
│   │   │               │   └── NotificationType.java
│   │   │               └── exception/
│   │   │                   ├── GlobalExceptionHandler.java
│   │   │                   ├── NotificationNotFoundException.java
│   │   │                   ├── InvalidNotificationTypeException.java
│   │   │                   └── EmailSendException.java
│   │   └── resources/
│   │       ├── templates/
│   │       │   ├── document-shared.html
│   │       │   ├── access-granted.html
│   │       │   ├── document-expired.html
│   │       │   └── generic.html
│   │       └── application.yml
│   └── test/
│       ├── resources/
│       │   └── application.yml
│       └── java/
│           └── com/
│               └── evault/
│                   └── notifications/
│                       ├── NotificationApplicationTests.java
│                       ├── controller/
│                       │   └── NotificationControllerTest.java
│                       └── service/
│                           ├── NotificationServiceTest.java
│                           ├── TemplateServiceTest.java
│                           └── EmailServiceTest.java
├── Dockerfile
├── pom.xml
└── README.md
```

---

## Notification Events

The service supports the following notification events:

| Event | Recipient | Subject |
|---|---|---|
| `DOCUMENT_UPLOADED` | Assigned judge | New document added to Case #[ID] |
| `DOCUMENT_SHARED` | Recipient wallet/user | A document has been shared with you |
| `ACCESS_GRANTED` | User granted access | You now have access to Case #[ID] |
| `ACCESS_REVOKED` | User losing access | Your access has been revoked |
| `DOCUMENT_AMENDED` | All case participants | Document updated: [doc name] |
| `DOCUMENT_EXPIRED` | Lawyer + client | Document expired: [doc name] |

---

## API Endpoints

Base path: `/api/notifications`

### 1. POST /api/notifications/send

Sends a notification email and stores the notification in history.

**Request body:**

```json
{
  "notificationType": "DOCUMENT_SHARED",
  "recipientWallet": "0xABC123...",
  "recipientEmail": "recipient@example.com",
  "recipientName": "Advocate Sharma",
  "documentName": "Affidavit.pdf",
  "caseId": "CASE-2026-001",
  "message": "Please review the shared document."
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "recipientWallet": "0xABC123...",
  "recipientEmail": "recipient@example.com",
  "type": "DOCUMENT_SHARED",
  "subject": "A document has been shared with you",
  "message": "Please review the shared document.",
  "documentName": "Affidavit.pdf",
  "caseId": "CASE-2026-001",
  "recipientName": "Advocate Sharma",
  "read": false,
  "createdAt": "2026-08-15T10:30:00",
  "emailSent": true
}
```

### 2. GET /api/notifications/user/{wallet}

Returns notification history for a user, newest first.

**Response (200 OK):**

```json
[
  {
    "id": 2,
    "recipientWallet": "0xABC123...",
    "recipientEmail": "recipient@example.com",
    "type": "ACCESS_GRANTED",
    "subject": "You now have access to Case #CASE-2026-001",
    "message": "Access granted.",
    "documentName": "Affidavit.pdf",
    "caseId": "CASE-2026-001",
    "recipientName": "Advocate Sharma",
    "read": false,
    "createdAt": "2026-08-15T10:35:00",
    "emailSent": false
  }
]
```

### 3. PUT /api/notifications/{id}/read

Marks a notification as read.

**Response (200 OK):**

```json
{
  "id": 1,
  "recipientWallet": "0xABC123...",
  "recipientEmail": "recipient@example.com",
  "type": "DOCUMENT_SHARED",
  "subject": "A document has been shared with you",
  "message": "Please review the shared document.",
  "documentName": "Affidavit.pdf",
  "caseId": "CASE-2026-001",
  "recipientName": "Advocate Sharma",
  "read": true,
  "createdAt": "2026-08-15T10:30:00",
  "emailSent": false
}
```

---

## Configuration

### Environment Variables

The service is configured entirely through environment variables. No credentials are hard-coded.

| Variable | Description | Default |
|---|---|---|
| `DB_URL` | MySQL JDBC connection URL | `jdbc:mysql://localhost:3306/evault_notifications?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC` |
| `DB_USERNAME` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `root` |
| `MAIL_HOST` | SMTP server host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP server port | `587` |
| `MAIL_USERNAME` | Email account username | `your-email@gmail.com` |
| `MAIL_PASSWORD` | Email account password / app password | `your-app-password` |
| `MAIL_FROM` | From address in outgoing emails | `noreply@evault.gov.in` |

### MySQL Configuration

Create a database (or let `createDatabaseIfNotExist=true` handle it):

```sql
CREATE DATABASE evault_notifications;
```

Set the credentials:

```bash
export DB_URL="jdbc:mysql://localhost:3306/evault_notifications?useSSL=false&serverTimezone=UTC"
export DB_USERNAME="your_mysql_user"
export DB_PASSWORD="your_mysql_password"
```

### Email Configuration

For Gmail, you need an **App Password** (not your regular password):

1. Enable 2-Step Verification on your Google account.
2. Go to Google Account → Security → App Passwords.
3. Generate a new app password for "Mail".
4. Set the environment variables:

```bash
export MAIL_HOST="smtp.gmail.com"
export MAIL_PORT="587"
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-16-char-app-password"
export MAIL_FROM="noreply@evault.gov.in"
```

---

## How to Run

### Prerequisites

- Java 17+
- Maven 3.6+
- MySQL 8+ (running and accessible)

### Run Locally

```bash
cd evault-notifications
mvn clean package -DskipTests
java -jar target/evault-notifications-1.0.0.jar
```

Or run with Maven directly:

```bash
mvn spring-boot:run
```

The service starts on **port 8085**.

### Run with Docker

```bash
cd evault-notifications
docker build -t evault-notifications .
docker run -p 8085:8085 \
  -e DB_URL="jdbc:mysql://host.docker.internal:3306/evault_notifications?useSSL=false&serverTimezone=UTC" \
  -e DB_USERNAME="root" \
  -e DB_PASSWORD="your_password" \
  -e MAIL_USERNAME="your-email@gmail.com" \
  -e MAIL_PASSWORD="your-app-password" \
  evault-notifications
```

### Run Tests

```bash
mvn test
```

Tests use an in-memory H2 database (no MySQL required) and verify:
1. Application context starts successfully
2. Notification history is saved
3. Notifications can be retrieved by wallet
4. Notifications can be marked as read
5. Send-notification request is processed
6. Email sending is attempted through Spring Mail
7. Template rendering produces correct HTML
8. Subject resolution for all notification types

---

## Integration with the Larger eVault Project

This service is designed to be integrated into the main eVault microservices architecture:

- **API Gateway** routes `/api/notifications/**` to this service on port 8085.
- **Document Service** calls `POST /api/notifications/send` when document events occur (upload, share, access grant/revoke, amendment, expiration).
- **Frontend** calls `GET /api/notifications/user/{wallet}` to display notification history and `PUT /api/notifications/{id}/read` to mark notifications as read.

### Integration Checklist

- [ ] Add this service to the eVault Docker Compose file with port 8085 exposed
- [ ] Configure the API Gateway to route `/api/notifications/**` → `http://evault-notifications:8085`
- [ ] Ensure the MySQL database `evault_notifications` is accessible (shared or dedicated instance)
- [ ] Configure SMTP credentials in the deployment environment
- [ ] Document Service should call the send endpoint with the appropriate `notificationType`

---

## Port

The service runs on **port 8085**.
