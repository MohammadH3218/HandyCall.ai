# TODO

- [ ] Investigate and fix error in business setup (pro setup) step 2/4:
  ```text
  /api/proxy/companies/me:1 Failed to load resource: the server responded with a status of 404 ()
  1528-892269d4028353f1.js:1 API request failed: Error: Cannot PUT /api/v1/companies/me
      at r.request (1493-ed5bb7a3ac4bee46.js:1:2746)
      at async r.updateMyCompany (1493-ed5bb7a3ac4bee46.js:1:6922)
      at async e2 (page-ce78665f3a4bea11.js:1:28913)
  ```
- [ ] Fix the logic for the email verification so it automatically "logs" you in and completes onboarding from the email.
- [ ] Improve UI in general (making small UI changes).
- [ ] Possibly add an NLP model (small detail: doesn't matter too much right now for the business category).
- [ ] Improve directory layout? (actual codebase)
- [ ] see what remains from the old business line vs current (thumbtack type of thing for KSA)