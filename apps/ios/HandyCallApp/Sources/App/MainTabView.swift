import SwiftUI

@MainActor
final class TabBadgeStore: ObservableObject {
    @Published var unreadNotifications: Int = 0

    func refresh(using api: APIClient) async {
        do {
            unreadNotifications = try await api.getUnreadNotificationCount()
        } catch {
            // Silently ignore badge fetch errors
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var badgeStore = TabBadgeStore()
    @State private var selectedTab: Tab = .home

    enum Tab: String {
        case home, calls, bookings, messages, more
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(Tab.home)

            CallsView()
                .tabItem {
                    Label("Calls", systemImage: "phone.fill")
                }
                .tag(Tab.calls)

            AppointmentsView()
                .tabItem {
                    Label("Bookings", systemImage: "calendar")
                }
                .tag(Tab.bookings)

            MessagesView()
                .tabItem {
                    Label("Messages", systemImage: "message.fill")
                }
                .tag(Tab.messages)

            MoreMenuView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
                .tag(Tab.more)
                .badge(badgeStore.unreadNotifications > 0 ? badgeStore.unreadNotifications : 0)
        }
        .tint(HandyCallTheme.emeraldFixed)
        .task {
            await badgeStore.refresh(using: container.apiClient)
        }
    }
}
