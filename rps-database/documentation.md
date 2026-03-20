# RPS Database

Database: rps_platform
Database type: PostgreSQL

Tables:

- users
- companies
- campaigns
- questions
- employees
- responses
- reports

Relationships:

companies → campaigns
campaigns → questions
companies → employees
employees → responses
questions → responses
campaigns → reports