package org.acra;

public final class ACRA {
    private static final ErrorReporter REPORTER = new ErrorReporter();
    public static ErrorReporter getErrorReporter() {
        return REPORTER;
    }
}
