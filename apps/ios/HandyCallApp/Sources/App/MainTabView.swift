import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }

            AppointmentsView()
                .tabItem {
                    Label("Appointments", systemImage: "calendar")
                }

            CallsView()
                .tabItem {
                    Label("Calls", systemImage: "phone")
                }

            ContactsView()
                .tabItem {
                    Label("Leads", systemImage: "person.2")
                }

            NotificationsView()
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
        .tint(HandyCallTheme.emeraldDark)
    }
}
