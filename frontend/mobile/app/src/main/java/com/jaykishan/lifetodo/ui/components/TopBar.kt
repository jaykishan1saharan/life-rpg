package com.jaykishan.lifetodo.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun TopBar(
    greeting: String,
    title: String,
    subtitle: String? = null
) {

    Column {

        Text(
            text = greeting,
            fontSize = 14.sp
        )

        Spacer(
            modifier = Modifier.height(3.dp)
        )

        Text(
            text = title,
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold
        )

        if (subtitle != null) {

            Spacer(
                modifier = Modifier.height(4.dp)
            )

            Text(
                text = subtitle,
                fontSize = 14.sp
            )
        }
    }
}