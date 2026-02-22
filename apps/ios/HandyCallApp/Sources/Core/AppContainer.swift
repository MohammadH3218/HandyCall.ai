import Foundation
import SwiftUI

@MainActor
final class AppContainer: ObservableObject {
    let apiClient: APIClient
    let socialAuthManager: SocialAuthManager
    let sessionStore: SessionStore
    let pushManager: PushNotificationManager

    init() {
        let api = APIClient()
        let socialAuthManager = SocialAuthManager()
        self.apiClient = api
        self.socialAuthManager = socialAuthManager
        self.sessionStore = SessionStore(apiClient: api)
        self.pushManager = PushNotificationManager(apiClient: api)
    }
}
