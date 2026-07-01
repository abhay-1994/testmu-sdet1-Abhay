Feature: Dashboard
  As a logged-in user of the TestMu AI platform
  I want the dashboard to load quickly, accurately, and appropriately for my role
  So that I can trust the summary information it shows me

  Background:
    Given I am logged in
    And I am on the dashboard page

  @dashboard @smoke
  Scenario: All dashboard widgets load successfully
    Then the "Recent Test Runs" widget should load and display data
    And the "Pass/Fail Summary" widget should load and display data
    And the "Team Activity Feed" widget should load and display data
    And the "Environment Health" widget should load and display data
    And no widget should display a loading spinner indefinitely

  @dashboard @negative
  Scenario: A single widget failure does not break the rest of the dashboard
    Given the "Environment Health" widget's data source is temporarily unavailable
    When the dashboard loads
    Then the "Environment Health" widget should display an inline error state, not a blank space
    And the "Recent Test Runs", "Pass/Fail Summary", and "Team Activity Feed" widgets should still load and display data normally
    And the rest of the page should remain fully interactive

  @dashboard
  Scenario: Dashboard widget data matches the underlying REST API
    Given there are known test runs and results in the system
    When I read the pass count shown on the "Pass/Fail Summary" widget
    And I query GET /api/testruns for the same date range
    Then the widget's displayed pass count should equal the count of passed runs returned by the API
    And the widget's displayed fail count should equal the count of failed runs returned by the API

  @dashboard
  Scenario: Filtering the dashboard by date range updates all relevant widgets
    Given the dashboard is showing data for the default date range
    When I change the dashboard date range filter to a custom range
    Then the "Recent Test Runs" widget should only show runs within that range
    And the "Pass/Fail Summary" widget counts should recalculate to match that range
    And the applied filter should remain visible/indicated on the page

  @dashboard
  Scenario: Filtering the dashboard by project shows only that project's data
    Given I have access to more than one project
    When I filter the dashboard by a specific project
    Then every widget that shows project-scoped data should only reflect that project
    And switching the filter back to "All Projects" should restore the unfiltered totals

  @dashboard
  Scenario: Sorting the "Recent Test Runs" table widget by column
    Given the "Recent Test Runs" widget is showing multiple test runs
    When I click the "Date" column header
    Then the rows should be sorted by date in descending order
    When I click the "Date" column header again
    Then the rows should be sorted by date in ascending order

  @dashboard @permissions
  Scenario Outline: Widget and action visibility is gated by user role
    Given I am logged in as a user with the "<role>" role
    When I view the dashboard
    Then the "<widget_or_action>" should be "<visibility>"

    Examples:
      | role          | widget_or_action                     | visibility |
      | Admin         | "Manage Users" quick action          | visible    |
      | Admin         | "System Health" widget               | visible    |
      | Regular User  | "Manage Users" quick action          | hidden     |
      | Regular User  | "System Health" widget               | hidden     |
      | Regular User  | "Recent Test Runs" widget            | visible    |
      | Read-Only User| "Create Test Run" quick action       | hidden     |
      | Read-Only User| "Recent Test Runs" widget            | visible    |

  @dashboard @permissions @negative
  Scenario: A read-only user cannot trigger write actions from the dashboard even via direct request
    Given I am logged in as a user with the "Read-Only User" role
    When I attempt to trigger a "Create Test Run" action directly (bypassing the hidden UI control)
    Then the request should be rejected with an authorization error
    And no test run should be created

  @dashboard
  Scenario Outline: Dashboard layout is responsive across common breakpoints
    Given my viewport width is <width>px
    When I load the dashboard
    Then the widgets should be arranged in "<layout>"
    And every widget's content should be fully visible without horizontal scrolling or clipped text

    Examples:
      | width | layout                              |
      | 1440  | a multi-column desktop grid         |
      | 768   | a two-column tablet layout          |
      | 375   | a single-column mobile layout       |

  @dashboard @negative
  Scenario: The dashboard navigation collapses into a menu control on mobile widths
    Given my viewport width is 375px
    When I load the dashboard
    Then the full sidebar navigation should not be shown by default
    And a menu toggle control should be visible and usable to reveal navigation on demand
