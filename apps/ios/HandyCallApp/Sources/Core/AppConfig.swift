import Foundation

enum APNSEnvironment: String {
    case sandbox
    case production
}

enum AppConfig {
    // Update for your environment.
    static let apiBaseURL = URL(string: "https://api.handycall.org/api/v1")!
    static let apnsEnvironment: APNSEnvironment = .production
}
