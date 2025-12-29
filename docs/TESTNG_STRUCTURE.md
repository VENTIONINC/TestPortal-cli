# TestNG XML Report Structure (testng-results.xml)

The TestNG XML report is typically named `testng-results.xml`. It provides a detailed report of the test execution.

## Hierarchy

- `<testng-results>`: The root element.
  - Attributes:
    - `ignored`: Number of ignored methods.
    - `total`: Total number of methods run.
    - `passed`: Number of passed methods.
    - `failed`: Number of failed methods.
    - `skipped`: Number of skipped methods.
  - Children:
    - `<reporter-output>`: Global logs.
    - `<suite>`: Represents a suite (from `testng.xml`).
      - Attributes:
        - `name`: Name of the suite.
        - `duration-ms`: Duration in milliseconds.
        - `started-at`: Start timestamp.
        - `finished-at`: End timestamp.
      - Children:
        - `<groups>`: Groups defined in the suite.
        - `<test>`: Represents a `<test>` tag in `testng.xml`.
          - Attributes:
            - `name`: Name of the test.
            - `duration-ms`: Duration in milliseconds.
            - `started-at`: Start timestamp.
            - `finished-at`: End timestamp.
          - Children:
            - `<class>`: Represents a test class.
              - Attributes:
                - `name`: Fully qualified class name.
              - Children:
                - `<test-method>`: Represents a test method (or configuration method).
                  - Attributes:
                    - `status`: Execution status (`PASS`, `FAIL`, `SKIP`).
                    - `signature`: Method signature.
                    - `name`: Method name.
                    - `duration-ms`: Duration in milliseconds.
                    - `started-at`: Start timestamp.
                    - `finished-at`: End timestamp.
                    - `description`: Test description (optional).
                    - `data-provider`: Name of the data provider (optional).
                    - `is-config`: `true` if it is a configuration method (@BeforeClass, etc.).
                  - Children:
                    - `<params>`: Parameters passed to the method.
                    - `<exception>`: Exception details if the method failed.
                      - Children:
                        - `<message>`: Exception message.
                        - `<full-stacktrace>`: Stack trace.
                    - `<reporter-output>`: Logs for this method.

## Status Values

The `status` attribute of `<test-method>` can have the following values:

- `PASS`: The test method passed.
- `FAIL`: The test method failed.
- `SKIP`: The test method was skipped.

## Sample XML

See `examples/testng-results-sample.xml` for a complete example.
