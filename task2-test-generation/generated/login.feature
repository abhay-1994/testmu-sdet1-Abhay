Feature: Login
  As a registered user of the TestMu AI platform
  I want to securely log in
  So that I can access my test management workspace

  Background:
    Given I am on the login page

  @login @smoke
  Scenario: Valid login with correct credentials
    When I enter a valid username and password
    And I submit the login form
    Then I should be redirected to the dashboard
    And I should see my account name in the top navigation bar

  @login @negative
  Scenario Outline: Login fails with invalid credentials
    When I enter username "<username>" and password "<password>"
    And I submit the login form
    Then I should see the error message "<error_message>"
    And I should remain on the login page

    Examples:
      | username      | password      | error_message                          |
      | valid_user    | wrong_pass    | Invalid username or password           |
      | unknown_user  | any_password  | Invalid username or password           |
      | valid_user    | (empty)       | Password is required                   |
      | (empty)       | valid_pass    | Username is required                   |
      | (empty)       | (empty)       | Username is required                   |

  @login @negative @security
  Scenario Outline: Username matching is case-sensitive and whitespace-sensitive
    When I enter username "<username>" and password with the correct valid password
    And I submit the login form
    Then I should see the error message "Invalid username or password"
    And I should remain on the login page

    Examples:
      | username           | note                              |
      | VALID_USER          | uppercase variant of a valid user |
      | " valid_user"       | leading whitespace                |
      | "valid_user "       | trailing whitespace                |

  @login @negative @security
  Scenario: Login form rejects SQL-injection-shaped input without raising a server error
    When I enter username "' OR '1'='1" and password "' OR '1'='1"
    And I submit the login form
    Then I should see the error message "Invalid username or password"
    And no server error (5xx) should occur
    And I should remain on the login page

  @login @smoke @security
  Scenario: Password field masks input as it is typed
    When I type a password into the password field
    Then each character should be displayed as a masked character (e.g. "•" or "*")
    And the raw password should not appear in the page's rendered HTML

  @login
  Scenario: Forgot password sends a reset link for a known account
    Given I am on the login page
    When I click the "Forgot your password?" link
    And I enter a registered email address
    And I submit the reset request
    Then I should see a confirmation message that a reset link has been sent
    And a password reset email should be sent to that address

  @login @negative
  Scenario: Forgot password does not reveal whether an email is registered
    Given I am on the login page
    When I click the "Forgot your password?" link
    And I enter an email address that is not registered
    And I submit the reset request
    Then I should see the same generic confirmation message as for a registered email
    And no password reset email should be sent

  @login @security
  Scenario: An expired session redirects the user back to the login page
    Given I am logged in and my session has expired on the server
    When I navigate to any authenticated page or trigger any authenticated API call
    Then I should be redirected to the login page
    And I should see a message indicating my session has expired
    And any unsaved form data should not be silently discarded without a warning where feasible

  @login @security
  Scenario: A cleared/invalidated session cannot access protected routes directly by URL
    Given I am logged in
    When my session cookie is cleared or invalidated
    And I navigate directly to a protected dashboard URL
    Then I should be redirected to the login page

  @login @security
  Scenario: Repeated failed login attempts lock the account
    # Assumed policy for this scenario: the account is locked after 5 consecutive failed
    # attempts within a 15-minute window, and stays locked for 15 minutes or until an admin
    # unlocks it. Adjust the numbers here to match the platform's real documented policy.
    # DO NOT run this scenario against a shared, production, or production-like environment —
    # it will lock a real account. Use a disposable test account in an isolated environment only.
    Given I have failed to log in 4 times in a row for a specific account within the lockout window
    When I fail to log in one more time with the same account
    Then the account should become locked
    And I should see a message telling me the account is locked
    And a subsequent login attempt with the CORRECT password should still be rejected while locked

  @login @negative @security
  Scenario: A locked account is not unlocked by simply waiting a few seconds
    Given an account is currently locked due to repeated failed login attempts
    When I immediately retry logging in with the correct password
    Then the login should still be rejected
    And the error message should indicate the account is locked, not that credentials are wrong
