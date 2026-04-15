import Foundation
import SwiftUI

@MainActor
final class AppContainer: ObservableObject {
    let apiClient: APIClient
    let socialAuthManager: SocialAuthManager
    let sessionStore: SessionStore
    let pushManager: PushNotificationManager
    let appearanceManager: AppearanceManager

    init() {
        let api = APIClient()
        let socialAuthManager = SocialAuthManager()
        let store = SessionStore(apiClient: api)
        self.apiClient = api
        self.socialAuthManager = socialAuthManager
        self.sessionStore = store
        self.pushManager = PushNotificationManager(apiClient: api)
        self.appearanceManager = AppearanceManager()

        // Log out the user whenever any authenticated request returns 401/403.
        api.onSessionExpired = { [weak store] in
            store?.logout()
        }
    }
}
