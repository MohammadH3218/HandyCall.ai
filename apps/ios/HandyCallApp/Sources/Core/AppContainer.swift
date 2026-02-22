import Foundation
import SwiftUI

@MainActor
final class AppContainer: ObservableObject {
    let apiClient: APIClient
    let sessionStore: SessionStore
    let pushManager: PushNotificationManager

    init() {
        let api = APIClient()
        self.apiClient = api
        self.sessionStore = SessionStore(apiClient: api)
        self.pushManager = PushNotificationManager(apiClient: api)
    }
}
